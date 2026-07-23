# CANDIDATE 候选版

夏姬使用固定 Agent ID `reviewer`。当前根目录为 v0.06 候选版。基础部署先验收当前会话 Stage/Review/Risk 记录、错误目标/重复/材料变化拒绝、Review/Risk/Test、生产拒绝、返工和熔断；专用持久化、目标 Generation、硬单次消费、精细 A2A 路由与历史授权后续独立验收。

本版完整继承 v0.05，只增加低/中/高 Risk 分类、同一 reviewer 的只读子 Agent和主会话非阻塞；NAS 当前运行 v0.06。最终 Review/Risk/Test 仍由父 reviewer 决定。
