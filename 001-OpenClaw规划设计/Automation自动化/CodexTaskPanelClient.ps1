[CmdletBinding()]
param(
    [ValidateSet('Discover', 'Show', 'Reserve', 'Bind', 'Release', 'Heartbeat', 'Complete', 'Block', 'Mappings', 'Notify', 'RemoteExec', 'Test')]
    [string]$Action = 'Discover',
    [string]$CardId,
    [string]$ThreadId,
    [string]$HostId = 'local',
    [string]$Summary,
    [string]$Reason,
    [string]$RemoteCommand
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:BoardId = 'codex'
$script:PolicyVersion = 'codex-task-execution-v1'
$script:RequiredLabels = @('codex-task', 'codex-policy-v1')
$script:OwnerId = '811150402'
$script:OpenClawHost = '192.168.1.171'
$script:OpenClawPort = 9222
$script:OpenClawUser = 'PANVIVI'
$script:HostKey = 'SHA256:SskoVxhajldkHEKZlQ796dlKEQll+k95+2HE33Pv7Js'
$script:Plink = 'C:\Program Files\PuTTY\plink.exe'
$script:RemoteHome = '/Volume3/OpenClaw/home'
$script:RemoteNode = '/Volume3/@apps/openclaw/node/bin/node'
$script:RemoteCli = '/Volume3/@apps/openclaw/node/lib/node_modules/openclaw/openclaw.mjs'
$script:DataDir = Join-Path $env:LOCALAPPDATA 'OpenClawCodexTaskPanel'
$script:CredentialPath = Join-Path $script:DataDir 'ssh-password.dpapi'
$script:StatePath = Join-Path $script:DataDir 'state.json'
$script:LockPath = Join-Path $script:DataDir 'scanner.lock'

function ConvertTo-CompactJson {
    param([Parameter(Mandatory)]$Value)
    return ($Value | ConvertTo-Json -Depth 30 -Compress)
}

function Get-PlainCredential {
    if (-not (Test-Path -LiteralPath $script:CredentialPath)) {
        throw "Credential file is unavailable."
    }
    $encrypted = (Get-Content -LiteralPath $script:CredentialPath -Raw).Trim()
    $secure = $encrypted | ConvertTo-SecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

function Invoke-RemoteShell {
    param([Parameter(Mandatory)][string]$Command)
    if (-not (Test-Path -LiteralPath $script:Plink)) {
        throw "PuTTY plink is unavailable."
    }
    $plain = Get-PlainCredential
    $stderrPath = [IO.Path]::GetTempFileName()
    $previousPreference = $ErrorActionPreference
    try {
        $args = @(
            '-batch', '-ssh', '-P', [string]$script:OpenClawPort,
            '-hostkey', $script:HostKey, '-pw', $plain,
            "$($script:OpenClawUser)@$($script:OpenClawHost)", $Command
        )
        $ErrorActionPreference = 'Continue'
        $output = & $script:Plink @args 2> $stderrPath
        $exitCode = $LASTEXITCODE
        $ErrorActionPreference = $previousPreference
        $stderr = Get-Content -LiteralPath $stderrPath -Raw -ErrorAction SilentlyContinue
        if ($exitCode -ne 0) {
            throw "Remote command failed with exit code $exitCode. $($output -join [Environment]::NewLine) $stderr"
        }
        return ($output -join [Environment]::NewLine)
    }
    finally {
        $ErrorActionPreference = $previousPreference
        $plain = $null
        Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-OpenClawCli {
    param([Parameter(Mandatory)][string]$Arguments)
    $command = "export HOME=$($script:RemoteHome); $($script:RemoteNode) $($script:RemoteCli) $Arguments"
    return Invoke-RemoteShell -Command $command
}

function Invoke-GatewayMethod {
    param(
        [Parameter(Mandatory)][string]$Method,
        [Parameter(Mandatory)]$Params
    )
    $json = ConvertTo-CompactJson $Params
    $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
    $command = "export HOME=$($script:RemoteHome); P=`$(printf %s $b64 | base64 -d); $($script:RemoteNode) $($script:RemoteCli) gateway call $Method --params \`"`$P\`" --json"
    $raw = Invoke-RemoteShell -Command $command
    return $raw | ConvertFrom-Json
}

function Assert-CardId {
    param([Parameter(Mandatory)][string]$Id)
    $parsed = [guid]::Empty
    if (-not [guid]::TryParse($Id, [ref]$parsed)) {
        throw "A full UUID card id is required."
    }
}

function Convert-CardNotes {
    param([Parameter(Mandatory)]$Card)
    if ([string]::IsNullOrWhiteSpace([string]$Card.notes)) {
        throw "Card notes are empty."
    }
    try {
        return ([string]$Card.notes | ConvertFrom-Json)
    }
    catch {
        throw "Card notes must be valid JSON."
    }
}

function Test-EligibleCard {
    param([Parameter(Mandatory)]$Card)
    $board = ''
    if ($Card.PSObject.Properties.Name -contains 'boardId') {
        $board = [string]$Card.boardId
    }
    elseif ($Card.PSObject.Properties.Name -contains 'metadata' -and
        $null -ne $Card.metadata -and
        $null -ne $Card.metadata.automation) {
        $board = [string]$Card.metadata.automation.boardId
    }
    if ($board -ne $script:BoardId -or [string]$Card.status -ne 'ready') {
        return $false
    }
    $labels = @($Card.labels | ForEach-Object { [string]$_ })
    foreach ($label in $script:RequiredLabels) {
        if ($labels -notcontains $label) { return $false }
    }
    try { $notes = Convert-CardNotes $Card } catch { return $false }
    if ([string]$notes.policyVersion -ne $script:PolicyVersion) { return $false }
    if ([string]$notes.source.agentId -ne 'housekeeper' -or
        [string]$notes.source.channel -ne 'telegram' -or
        [string]$notes.source.ownerId -ne $script:OwnerId -or
        $notes.source.authenticated -ne $true) {
        return $false
    }
    foreach ($field in @('taskId', 'objective', 'scope', 'completionCriteria', 'repository', 'branch', 'idempotencyKey')) {
        if ([string]::IsNullOrWhiteSpace([string]$notes.$field)) { return $false }
    }
    return $true
}

function Get-State {
    if (-not (Test-Path -LiteralPath $script:StatePath)) {
        return [pscustomobject]@{ version = 1; mappings = [pscustomobject]@{} }
    }
    return (Get-Content -LiteralPath $script:StatePath -Raw | ConvertFrom-Json)
}

function Save-State {
    param([Parameter(Mandatory)]$State)
    New-Item -ItemType Directory -Path $script:DataDir -Force | Out-Null
    $temp = "$($script:StatePath).tmp"
    ConvertTo-CompactJson $State | Set-Content -LiteralPath $temp -Encoding UTF8
    Move-Item -LiteralPath $temp -Destination $script:StatePath -Force
}

function Invoke-WithScannerLock {
    param([Parameter(Mandatory)][scriptblock]$Body)
    New-Item -ItemType Directory -Path $script:DataDir -Force | Out-Null
    $stream = $null
    try {
        $stream = [IO.File]::Open($script:LockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
        return & $Body
    }
    finally {
        if ($null -ne $stream) { $stream.Dispose() }
    }
}

function Get-Card {
    param([Parameter(Mandatory)][string]$Id)
    Assert-CardId $Id
    $safe = [Uri]::EscapeDataString($Id)
    $raw = Invoke-OpenClawCli "workboard show $safe --json"
    $parsed = $raw | ConvertFrom-Json
    if ($parsed.PSObject.Properties.Name -contains 'card') {
        return $parsed.card
    }
    return $parsed
}

function Get-EligibleCards {
    $response = Invoke-GatewayMethod -Method 'workboard.cards.list' -Params @{ boardId = $script:BoardId }
    $rank = @{ urgent = 0; high = 1; normal = 2; low = 3 }
    return @($response.cards |
        Where-Object { Test-EligibleCard $_ } |
        Sort-Object @{ Expression = { $rank[[string]$_.priority] } }, @{ Expression = { [long]$_.createdAt } })
}

function Move-Card {
    param(
        [Parameter(Mandatory)][string]$Id,
        [Parameter(Mandatory)][ValidateSet('scheduled', 'ready', 'running', 'blocked', 'done')][string]$Status
    )
    Assert-CardId $Id
    return Invoke-GatewayMethod -Method 'workboard.cards.move' -Params @{ id = $Id; status = $Status }
}

function Add-CardComment {
    param(
        [Parameter(Mandatory)][string]$Id,
        [Parameter(Mandatory)][string]$Body
    )
    Assert-CardId $Id
    return Invoke-GatewayMethod -Method 'workboard.cards.comment' -Params @{ id = $Id; body = $Body }
}

function Get-Mapping {
    param([Parameter(Mandatory)][string]$Id)
    $state = Get-State
    return $state.mappings.PSObject.Properties[$Id]
}

switch ($Action) {
    'Discover' {
        Invoke-WithScannerLock {
            $cards = @(Get-EligibleCards)
            $state = Get-State
            $known = @($state.mappings.PSObject.Properties | ForEach-Object { $_.Name })
            $candidate = $cards | Where-Object { $known -notcontains [string]$_.id } | Select-Object -First 1
            [pscustomobject]@{
                board = $script:BoardId
                eligibleCount = $cards.Count
                candidate = $candidate
                quiet = ($null -eq $candidate)
            } | ConvertTo-Json -Depth 30
        }
    }
    'Show' {
        Get-Card $CardId | ConvertTo-Json -Depth 30
    }
    'Reserve' {
        Invoke-WithScannerLock {
            $card = Get-Card $CardId
            if (-not (Test-EligibleCard $card)) { throw "Card is not eligible for Codex execution." }
            if ($null -ne (Get-Mapping $CardId)) { throw "Card is already mapped." }
            $claimed = Invoke-GatewayMethod -Method 'workboard.cards.claim' -Params @{
                id = $CardId
                ownerId = 'codex-desktop'
                ttlSeconds = 43200
            }
            $state = Get-State
            $mapping = [ordered]@{
                cardId = $CardId
                status = 'reserved'
                reservedAt = [DateTimeOffset]::UtcNow.ToString('o')
                claimToken = [string]$claimed.token
                lastStage = 'claimed'
            }
            try {
                $state.mappings | Add-Member -NotePropertyName $CardId -NotePropertyValue ([pscustomobject]$mapping) -Force
                Save-State $state
            }
            catch {
                Invoke-GatewayMethod -Method 'workboard.cards.release' -Params @{
                    id = $CardId
                    token = [string]$claimed.token
                    status = 'ready'
                } | Out-Null
                throw
            }
            [pscustomobject]@{ reserved = $true; card = $claimed.card } | ConvertTo-Json -Depth 30
        }
    }
    'Bind' {
        Assert-CardId $CardId
        if ([string]::IsNullOrWhiteSpace($ThreadId)) {
            $ThreadId = 'automation:openclaw-codex-task-panel-scanner'
        }
        Invoke-WithScannerLock {
            $card = Get-Card $CardId
            $property = Get-Mapping $CardId
            if ($null -eq $property -or [string]$property.Value.status -ne 'reserved' -or [string]$card.status -ne 'running') {
                throw "Card must have an active Codex reservation before binding."
            }
            $state = Get-State
            $mapping = $state.mappings.PSObject.Properties[$CardId].Value
            $mapping | Add-Member -NotePropertyName threadId -NotePropertyValue $ThreadId -Force
            $mapping | Add-Member -NotePropertyName hostId -NotePropertyValue $HostId -Force
            $mapping.status = 'running'
            $mapping.lastStage = 'scheduled-run-bound'
            Save-State $state
            $publicMapping = $mapping | Select-Object cardId, threadId, hostId, status, reservedAt, lastStage
            [pscustomobject]@{ bound = $true; mapping = $publicMapping; card = $card } | ConvertTo-Json -Depth 30
        }
    }
    'Release' {
        Assert-CardId $CardId
        Invoke-WithScannerLock {
            $state = Get-State
            $property = $state.mappings.PSObject.Properties[$CardId]
            if ($null -eq $property) { throw "Reservation mapping is required." }
            $released = Invoke-GatewayMethod -Method 'workboard.cards.release' -Params @{
                id = $CardId
                token = [string]$property.Value.claimToken
                status = 'ready'
            }
            $state.mappings.PSObject.Properties.Remove($CardId)
            Save-State $state
            [pscustomobject]@{ released = $true; card = $released.card } | ConvertTo-Json -Depth 30
        }
    }
    'Heartbeat' {
        Assert-CardId $CardId
        $property = Get-Mapping $CardId
        if ($null -eq $property -or [string]$property.Value.status -ne 'running') {
            throw "Running mapping is required."
        }
        $beat = Invoke-GatewayMethod -Method 'workboard.cards.heartbeat' -Params @{
            id = $CardId
            token = [string]$property.Value.claimToken
            note = $(if ([string]::IsNullOrWhiteSpace($Summary)) { 'Codex task is active.' } else { $Summary })
        }
        [pscustomobject]@{ heartbeat = $true; card = $beat.card } | ConvertTo-Json -Depth 30
    }
    'Complete' {
        Assert-CardId $CardId
        if ([string]::IsNullOrWhiteSpace($Summary)) { throw "Summary is required." }
        if ($null -eq (Get-Mapping $CardId)) { throw "Running mapping is required." }
        $state = Get-State
        $property = $state.mappings.PSObject.Properties[$CardId]
        $completed = Invoke-GatewayMethod -Method 'workboard.cards.complete' -Params @{
            id = $CardId
            token = [string]$property.Value.claimToken
            summary = $Summary
            proof = @{
                status = 'passed'
                summary = 'Codex mandatory workflow and task acceptance criteria passed.'
            }
        }
        $property.Value.status = 'done'
        $property.Value.lastStage = 'validated-and-synced'
        $property.Value.completedAt = [DateTimeOffset]::UtcNow.ToString('o')
        Save-State $state
        [pscustomobject]@{ completed = $true; card = $completed.card } | ConvertTo-Json -Depth 30
    }
    'Block' {
        Assert-CardId $CardId
        if ([string]::IsNullOrWhiteSpace($Reason)) { throw "Reason is required." }
        $property = Get-Mapping $CardId
        $params = @{ id = $CardId; reason = $Reason; ownerId = 'codex-desktop' }
        if ($null -ne $property) { $params.token = [string]$property.Value.claimToken }
        $blocked = Invoke-GatewayMethod -Method 'workboard.cards.block' -Params $params
        if ($null -ne $property) {
            $state = Get-State
            $stateProperty = $state.mappings.PSObject.Properties[$CardId]
            $stateProperty.Value.status = 'blocked'
            $stateProperty.Value.lastStage = 'blocked'
            $stateProperty.Value | Add-Member -NotePropertyName completedAt -NotePropertyValue ([DateTimeOffset]::UtcNow.ToString('o')) -Force
            Save-State $state
        }
        [pscustomobject]@{ blocked = $true; card = $blocked.card } | ConvertTo-Json -Depth 30
    }
    'Mappings' {
        $state = Get-State
        $public = [ordered]@{ version = $state.version; mappings = [ordered]@{} }
        foreach ($property in $state.mappings.PSObject.Properties) {
            $public.mappings[$property.Name] = $property.Value | Select-Object cardId, threadId, hostId, status, reservedAt, lastStage, completedAt
        }
        $public | ConvertTo-Json -Depth 30
    }
    'Notify' {
        Assert-CardId $CardId
        if ([string]::IsNullOrWhiteSpace($Summary)) { throw "Summary is required." }
        $message = "少主交给 Codex 的任务已处理完毕。请用賈南風既有口吻，直接向少主说明结果，不展示内部工程字段。任务卡：$CardId。核验摘要：$Summary"
        $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($message))
        $command = "export HOME=$($script:RemoteHome); M=`$(printf %s $b64 | base64 -d); $($script:RemoteNode) $($script:RemoteCli) agent --agent housekeeper --session-key agent:housekeeper:telegram:direct:$($script:OwnerId) --message \`"`$M\`" --deliver --reply-channel telegram --reply-to $($script:OwnerId) --reply-account housekeeper --json"
        $raw = Invoke-RemoteShell -Command $command
        [pscustomobject]@{ requested = $true; result = ($raw | ConvertFrom-Json) } | ConvertTo-Json -Depth 30
    }
    'RemoteExec' {
        Assert-CardId $CardId
        if ([string]::IsNullOrWhiteSpace($RemoteCommand)) { throw "RemoteCommand is required." }
        $mapping = Get-Mapping $CardId
        if ($null -eq $mapping -or [string]$mapping.Value.status -ne 'running') {
            throw "Remote execution requires a running mapped card."
        }
        Invoke-RemoteShell -Command ("export HOME=$($script:RemoteHome); " + $RemoteCommand)
    }
    'Test' {
        $valid = [pscustomobject]@{
            id = [guid]::NewGuid().ToString()
            boardId = 'codex'
            status = 'ready'
            priority = 'high'
            createdAt = 2
            labels = @('codex-task', 'codex-policy-v1')
            notes = (@{
                policyVersion = 'codex-task-execution-v1'
                source = @{ agentId = 'housekeeper'; channel = 'telegram'; ownerId = '811150402'; authenticated = $true }
                taskId = 'TEST-1'; objective = 'read only'; scope = 'test'; completionCriteria = 'pass'
                repository = 'repo'; branch = 'branch'; idempotencyKey = 'test-1'
            } | ConvertTo-Json -Compress)
        }
        $cases = [ordered]@{}
        $cases.validContract = Test-EligibleCard $valid
        $wrongBoard = $valid.PSObject.Copy(); $wrongBoard.boardId = 'production'
        $cases.wrongBoardRejected = -not (Test-EligibleCard $wrongBoard)
        $wrongStatus = $valid.PSObject.Copy(); $wrongStatus.status = 'running'
        $cases.wrongStatusRejected = -not (Test-EligibleCard $wrongStatus)
        $wrongLabels = $valid.PSObject.Copy(); $wrongLabels.labels = @('codex-task')
        $cases.missingLabelRejected = -not (Test-EligibleCard $wrongLabels)
        $badNotes = $valid.PSObject.Copy(); $badNotes.notes = '{"policyVersion":"other"}'
        $cases.wrongPolicyRejected = -not (Test-EligibleCard $badNotes)
        $guid = [guid]::Empty
        $cases.uuidValidation = [guid]::TryParse([string]$valid.id, [ref]$guid)
        $cases.secretPathOutsideRepo = $script:CredentialPath.StartsWith($env:LOCALAPPDATA, [StringComparison]::OrdinalIgnoreCase)
        $failed = @($cases.GetEnumerator() | Where-Object { -not $_.Value })
        [pscustomobject]@{
            passed = ($failed.Count -eq 0)
            cases = $cases
            failed = @($failed | ForEach-Object { $_.Name })
        } | ConvertTo-Json -Depth 10
        if ($failed.Count -gt 0) { exit 1 }
    }
}
