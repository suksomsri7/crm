# CRM API Documentation

เอกสาร API สำหรับระบบ CRM

## ไฟล์เอกสาร

| ไฟล์ | สำหรับ | รายละเอียด |
|------|--------|------------|
| [API-MANUAL.md](./API-MANUAL.md) | Developer / Manual | คู่มือ API แบบเต็ม - ทุก Endpoint, Parameters, Response |
| [API-AGENT.md](./API-AGENT.md) | Agent OpenCLaw | สรุปสั้น Flow และ Endpoints หลักสำหรับ Agent |
| [openapi.yaml](./openapi.yaml) | Tools / Swagger | OpenAPI 3.0 specification สำหรับ import ใน Postman, Swagger UI |
| [INSTALL.md](./INSTALL.md) | DevOps / VPS | คู่มือติดตั้งบน VPS ด้วย Docker, Nginx, SSL |
| [OPENCLAW-PROMPT.md](./OPENCLAW-PROMPT.md) | Agent OpenCLaw | คำสั่ง Prompt สำหรับตั้งค่า Agent |

## การใช้งานกับ Agent OpenCLaw

1. อ่าน **API-AGENT.md** เพื่อเข้าใจ Flow และ Endpoints หลัก
2. เรียก **GET /api/entities/check** ก่อนเพิ่ม Lead/Customer ทุกครั้ง
3. ใช้ **externalId** (Customer ID) เพื่อป้องกันข้อมูลซ้ำ
4. อ้างอิง **API-MANUAL.md** สำหรับรายละเอียด request/response เต็มรูปแบบ

## Authentication

API ใช้ Session (Cookie) — ต้อง Login ก่อน แล้วส่ง Cookie ในทุก request
