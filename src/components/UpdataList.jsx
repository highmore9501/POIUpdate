// src/components/UpdateList.js
import React, { useEffect, useState } from "react";
import axios from "axios";

const UpdateList = () => {
  const [updates, setUpdates] = useState([]);

  // 从服务器获取更新信息
  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const response = await axios.get("http://localhost:3000/updates");
        setUpdates(response.data);
      } catch (error) {
        console.error("Error fetching updates:", error);
      }
    };

    fetchUpdates();
  }, []);

  // 处理操作按钮点击
  const handleAction = (id, action) => {
    console.log(`Performing action: ${action} on update ID: ${id}`);
    // 这里你可以根据action执行不同的操作
  };

  return (
    <div>
      <h1>Update List</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Event</th>
            <th>Data</th>
            <th>Auth Code</th>
            <th>Timestamp</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {updates.map((update) => (
            <tr key={update.id}>
              <td>{update.id}</td>
              <td>{update.event}</td>
              <td>{update.data}</td>
              <td>{update.authCode}</td>
              <td>{update.timestamp}</td>
              <td>
                <button onClick={() => handleAction(update.id, "approve")}>
                  Approve
                </button>
                <button onClick={() => handleAction(update.id, "reject")}>
                  Reject
                </button>
                <button onClick={() => handleAction(update.id, "delete")}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UpdateList;
