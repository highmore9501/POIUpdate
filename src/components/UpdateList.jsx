import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, Button, message } from "antd";

const UpdateList = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);

  // 从服务器获取更新信息
  useEffect(() => {
    const fetchUpdates = async () => {
      setLoading(true);
      try {
        const response = await axios.get("http://localhost:5000/updates");
        setUpdates(response.data);
      } catch (error) {
        console.error("Error fetching updates:", error);
        message.error("Failed to fetch updates");
      } finally {
        setLoading(false);
      }
    };

    fetchUpdates();
  }, []);

  const deleteUpdate = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/deleteUpdateRecord/${id}`);
      setUpdates((prevUpdates) =>
        prevUpdates.filter((update) => update.id !== id)
      );
      message.success("Update deleted successfully");
    } catch (error) {
      console.error("Error deleting update:", error);
      message.error("Failed to delete update");
    }
  };

  // 处理操作按钮点击
  const handleAction = (record, action) => {
    const { id, event, data, authCode } = record;
    if (action === "approve") {
      // 处理 approve 操作
    } else if (action === "reject") {
      // 处理 reject 操作
    } else if (action === "delete") {
      deleteUpdate(id);
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Event",
      dataIndex: "event",
      key: "event",
    },
    {
      title: "Data",
      dataIndex: "data",
      key: "data",
    },
    {
      title: "Auth Code",
      dataIndex: "authCode",
      key: "authCode",
    },
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
    },
    {
      title: "Actions",
      key: "actions",
      render: (text, record) => (
        <span>
          <Button
            type="primary"
            onClick={() => handleAction(record, "approve")}
            style={{ marginRight: 8 }}
          >
            Approve
          </Button>
          <Button
            type="default"
            onClick={() => handleAction(record, "reject")}
            style={{ marginRight: 8 }}
          >
            Reject
          </Button>
          <Button type="danger" onClick={() => handleAction(record, "delete")}>
            Delete
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <h1>Update List</h1>
      <Table
        columns={columns}
        dataSource={updates}
        rowKey="id"
        loading={loading}
      />
    </div>
  );
};

export default UpdateList;
