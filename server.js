const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");

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

// 根据环境变量加载不同的 .env 文件
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: path.resolve(__dirname, ".env.production") });
} else {
  dotenv.config({ path: path.resolve(__dirname, ".env") });
}

// 设置数据库路径
const updateDbPath = path.join(__dirname, "src/database/update.sqlite");

// 创建数据库连接
const updateDb = new sqlite3.Database(updateDbPath, (err) => {
  if (err) {
    console.error("Could not connect to database", err);
  } else {
    console.log("Connected to database");
    // 创建一个表来存储更新
    updateDb.run(
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

const deleteRecordById = (id, res) => {
  updateDb.run("DELETE FROM updates WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).send(err.message);
    }
    res.status(200).send({ id });
  });
};

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

  updateDb.run(
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
  updateDb.all("SELECT * FROM updates", [], (err, rows) => {
    if (err) {
      return res.status(500).send(err.message);
    }
    res.status(200).send(rows);
  });
});

app.post("/updateDataBase", async (req, res) => {
  const { event, data, id } = req.body;
  console.log("event", event);
  console.log("data", data);
  console.log("authCode", id);
  if (event === "add-new-tag") {
    await insertTag(data);
  } else if (event === "remove-tag") {
    await removeTag(data);
  } else if (event === "insert-poi") {
    const formData = JSON.parse(data);
    await insertPOI(formData);
  } else if (event === "insert-history") {
    await insertHistoryWithTags(data);
  }
  deleteRecordById(id, res);
});

app.delete("/deleteUpdateRecord/:id", (req, res) => {
  const { id } = req.params;
  deleteRecordById(id, res);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});

// 捕获进程终止信号并关闭数据库连接
const gracefulShutdown = () => {
  console.log("Received shutdown signal, closing database connection...");
  updateDb.close((err) => {
    if (err) {
      console.error("Error closing database connection", err);
    } else {
      console.log("Database connection closed");
    }
    process.exit(0);
  });
};

process.on("SIGINT", gracefulShutdown); // 捕获 Ctrl+C 事件
process.on("SIGTERM", gracefulShutdown); // 捕获 kill 命令

module.exports = { app, updateDb };
