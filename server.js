const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");
const { pinyin } = require("pinyin");

const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(cors());

const {
  insertHistoryWithTags,
  insertPOI,
  insertTag,
  removeTag,
  getPinyinInitials,
} = require("./src/database/database");

// 设置数据库路径
const dbPath = path.join(__dirname, "src/database/update.sqlite");

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Could not connect to database", err);
  } else {
    console.log("Connected to database");
    // 创建一个表来存储更新
    db.run(
      `CREATE TABLE IF NOT EXISTS updates (
        id INTEGER PRIMARY KEY,
        event TEXT,
        data TEXT,
        authCode TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => {
        if (err) {
          console.error("Could not create table", err);
        } else {
          console.log("Table 'updates' created or already exists");
        }
      }
    );
  }
});

// 接收用户更新
app.post("/update", (req, res) => {
  const { event, data, authCode } = req.body;
  let dataString;

  // 检查 data 是否为对象，如果是则转换为字符串
  if (typeof data === "object") {
    dataString = JSON.stringify(data);
  } else {
    dataString = data;
  }

  db.run(
    "INSERT INTO updates (event, data, authCode) VALUES (?, ?, ?)",
    [event, dataString, authCode],
    function (err) {
      if (err) {
        return res.status(500).send(err.message);
      }
      res.status(200).send({ id: this.lastID });
    }
  );
});

// 添加一个路由来返回 MD5 值
app.get("/checkupdate", (req, res) => {
  // 这里暂时返回一个占位符 MD5 值
  const md5Value = "d41d8cd98f00b204e9800998ecf8427e"; // 这是一个示例 MD5 值
  res.status(200).send({ md5: md5Value });
});

app.get("/updates", (req, res) => {
  db.all("SELECT * FROM updates", [], (err, rows) => {
    if (err) {
      return res.status(500).send(err.message);
    }
    res.status(200).send(rows);
  });
});

app.get("/updateDataBase", (req, res) => {
  const { event, data, authCode } = req.body;
  console.log("event", event);
  console.log("data", data);
  console.log("authCode", authCode);
  if (event === "add-new-tag") {
    insertTag(data);
  } else if (event === "remove-tag") {
    removeTag(data);
  } else if (event === "insert-poi") {
    insertPOI(data);
  } else if (event === "insert-history") {
    insertHistoryWithTags(data);
  }
  res.status(200).send("success");
});

app.delete("/deleteUpdateRecord/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM updates WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).send(err.message);
    }
    res.status(200).send({ id });
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = { app, db };
