import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, Button, message } from "antd";

const serverUrl = process.env.REACT_APP_SERVER_URL;

const UpdateList = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);

  // 从服务器获取更新信息
  useEffect(() => {
    const fetchUpdates = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${serverUrl}/updates`);
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
      await axios.delete(`${serverUrl}/deleteUpdateRecord/${id}`);
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
  const handleAction = async (record, action) => {
    const { id, event, data, authCode } = record;
    if (action === "approve") {
      try {
        const response = await axios.post(`${serverUrl}/updateDataBase`, {
          event,
          data,
          id,
        });

        if (response.status === 200) {
          console.log("Request successful");
          await deleteUpdate(id);
        } else {
          console.error("Request failed");
        }
      } catch (error) {
        console.error("Error:", error);
      }
    } else if (action === "delete") {
      deleteUpdate(id);
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
    },
    {
      title: "Event",
      dataIndex: "event",
      key: "event",
      width: 150,
    },
    {
      title: "Data",
      dataIndex: "data",
      key: "data",
      width: 300,
      ellipsis: true,
    },
    {
      title: "Auth Code",
      dataIndex: "authCode",
      key: "authCode",
      width: 200,
      ellipsis: true,
    },
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 200,
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (text, record) => (
        <span>
          <Button
            type="primary"
            onClick={() => handleAction(record, "approve")}
            style={{ marginRight: 8 }}
          >
            Approve
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
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
};

export default UpdateList;
