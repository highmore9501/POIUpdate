const request = require("supertest");
const { app, db } = require("../server.js");

describe("API Endpoints", () => {
  describe("POST /update", () => {
    it("should insert a new update", async () => {
      const res = await request(app)
        .post("/update")
        .send({ event: "test", data: "test data", authCode: "test code" });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
    });
  });

  describe("POST /update", () => {
    it("should insert a new update with JSON data", async () => {
      const jsonData = {
        key1: "value1",
        key2: "value2",
        nested: {
          key3: "value3",
        },
      };

      const res = await request(app)
        .post("/update")
        .send({ event: "test", data: jsonData, authCode: "test code" });

      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();

      // 验证数据库中的数据
      return new Promise((resolve, reject) => {
        db.get(
          "SELECT data FROM updates WHERE id = ?",
          [res.body.id],
          (err, row) => {
            if (err) {
              reject(err);
            } else {
              // 解析数据库中的 JSON 字符串
              const insertedData = JSON.parse(row.data);
              expect(insertedData).toEqual(jsonData); // 验证数据是否一致
              resolve();
            }
          }
        );
      });
    });
  });

  describe("GET /checkupdate", () => {
    it("should return an MD5 value", async () => {
      const res = await request(app).get("/checkupdate");
      expect(res.status).toBe(200);
      expect(res.body.md5).toBeDefined();
    });
  });
});
