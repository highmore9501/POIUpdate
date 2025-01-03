const sqlite3 = require("sqlite3").verbose();
const { getPinyinInitials } = require("../scripts/importPOIs");
const fs = require("fs");
const dotenv = require("dotenv");

const dbPath = "data.sqlite";

function fetchTags() {
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    db.all(
      "SELECT tag_id, tag_name, pinyin_initials FROM tag",
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );

    db.close((err) => {
      if (err) {
        logger.error(err.message);
      }
    });
  });
}

function insertPOI(formData) {
  logger.info("formData in insertPOI:", formData);
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        const poiId = await insertOrUpdatePOI(db, formData);
        await updatePOITags(db, poiId, formData.tags);
        await insertRecommendations(db, poiId, formData.recommendations);
        resolve({ id: poiId });
      } catch (err) {
        reject(err);
      } finally {
        db.close((err) => {
          if (err) {
            logger.error("Error closing database:", err.message);
          }
        });
      }
    });
  });
}

function insertOrUpdatePOI(db, formData) {
  logger.info("formData in insertOrUpdatePOI:", formData);
  const { name, parent_id, description, href, level, weight } = formData;
  const pinyinInitials = getPinyinInitials(name);

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO POI (parent_id, description, href, level, weight, name, pinyin_initials) 
       VALUES (?, ?, ?, ?, ?, ?,?)
       ON CONFLICT(name) DO UPDATE SET 
       parent_id=excluded.parent_id, 
       description=excluded.description, 
       href=excluded.href, 
       level=excluded.level, 
       weight=excluded.weight,
       pinyin_initials=excluded.pinyin_initials`,
      [parent_id, description, href, level, weight, name, pinyinInitials],
      function (err) {
        if (err) {
          logger.error("Error inserting POI:", err);
          return reject(err);
        }

        logger.info("Inserted POI with name:", name);

        db.get(
          `SELECT id FROM POI WHERE name = ?`,
          [name],
          function (err, row) {
            if (err) {
              logger.error("Error selecting POI:", err);
              return reject(err);
            }

            logger.info("Selected POI with name:", name);
            resolve(row.id);
          }
        );
      }
    );
  });
}

function updatePOITags(db, poiId, tags) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT tag_id FROM POI_tag WHERE poi_id = ?`,
      [poiId],
      (err, existingTags) => {
        if (err) {
          logger.error("Error fetching existing POI_tags:", err);
          return reject(err);
        }

        const existingTagIds = existingTags.map((tag) => tag.tag_id);
        const newTagNames = tags.map((tag) => tag.tag_name);

        // Find tags to delete
        const tagsToDelete = existingTagIds.filter(
          (tagId) => !newTagNames.includes(tagId)
        );

        // Find tags to add
        const tagsToAdd = tags.filter(
          (tag) => !existingTagIds.includes(tag.tag_id)
        );

        const deletePromises = tagsToDelete.map((tagId) => {
          return new Promise((resolve, reject) => {
            db.run(
              `DELETE FROM POI_tag WHERE poi_id = ? AND tag_id = ?`,
              [poiId, tagId],
              function (err) {
                if (err) {
                  logger.error("Error deleting POI_tag:", err);
                  return reject(err);
                }
                resolve();
              }
            );
          });
        });

        const insertPromises = tagsToAdd.map((tag) => {
          return new Promise((resolve, reject) => {
            db.get(
              `SELECT tag_id FROM tag WHERE tag_name = ?`,
              [tag.tag_name],
              function (err, row) {
                if (err) {
                  logger.error("Error selecting tag:", err);
                  return reject(err);
                }

                const tagId = row.tag_id;

                db.run(
                  `INSERT INTO POI_tag (poi_id, tag_id) VALUES (?, ?)`,
                  [poiId, tagId],
                  function (err) {
                    if (err) {
                      logger.error("Error inserting POI_tag:", err);
                      return reject(err);
                    }
                    resolve();
                  }
                );
              }
            );
          });
        });

        Promise.all([...deletePromises, ...insertPromises])
          .then(() => resolve())
          .catch((err) => reject(err));
      }
    );
  });
}

function insertRecommendations(db, poiId, recommendations) {
  const insertRecommendationPromises = recommendations.map((recommendation) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM target_audience WHERE target_audience = ?`,
        [recommendation.audience],
        function (err, row) {
          if (err) {
            logger.error("Error selecting target_audience:", err);
            return reject(err);
          }

          const audienceId = row.id;

          db.run(
            `INSERT INTO recommend_reason (poi_id, target_audience_id, reason) VALUES (?, ?, ?)`,
            [poiId, audienceId, recommendation.recommendation],
            function (err) {
              if (err) {
                logger.error("Error inserting recommend_reason:", err);
                return reject(err);
              }
              resolve();
            }
          );
        }
      );
    });
  });

  return Promise.all(insertRecommendationPromises);
}

function fetchTargetAudience() {
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id, target_audience FROM target_audience",
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );

    db.close((err) => {
      if (err) {
        logger.error(err.message);
      }
    });
  });
}

function searchPOIByName(keyword) {
  const db = new sqlite3.Database(dbPath);
  logger.info("Searching POI by name or pinyin initials:", keyword);

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, name, description FROM POI WHERE name LIKE ? OR pinyin_initials LIKE ?`,
      [`%${keyword}%`, `%${keyword}%`],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );

    db.close((err) => {
      if (err) {
        logger.error(err.message);
      }
    });
  });
}

function searchPOIByExactName(name) {
  const db = new sqlite3.Database(dbPath);
  logger.info("Searching POI by exact name:", name);

  return new Promise((resolve, reject) => {
    db.all(`SELECT id, name FROM POI WHERE name = ?`, [name], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });

    db.close((err) => {
      if (err) {
        logger.error(err.message);
      }
    });
  });
}

function getPOILevel(parent_id) {
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    function calculateLevel(id, level) {
      if (!id) {
        resolve(level);
        return;
      }

      db.get(`SELECT parent_id FROM POI WHERE id = ?`, [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(level);
        } else {
          calculateLevel(row.parent_id, level + 1);
        }
      });
    }

    calculateLevel(parent_id, 0);

    db.close((err) => {
      if (err) {
        logger.error(err.message);
      }
    });
  });
}

function getPOIsByTags(tags) {
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    const tagNames = tags.map((tag) => tag.tag_name);
    const placeholders = tagNames.map(() => "?").join(",");

    const query = `
      SELECT POI.id, POI.name, POI.description
      FROM POI
      JOIN POI_tag ON POI.id = POI_tag.poi_id
      JOIN tag ON POI_tag.tag_id = tag.tag_id
      WHERE tag.tag_name IN (${placeholders})
      GROUP BY POI.id
      HAVING COUNT(DISTINCT tag.tag_name) = ?
    `;

    db.all(query, [...tagNames, tagNames.length], (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

function insertHistoryWithTags(tags) {
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    const currentTime = Math.floor(Date.now() / 1000); // 获取当前时间的 Unix 时间戳（秒）

    db.serialize(() => {
      const insertPromises = tags.map((tag) => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO history (tag_id, used_time) VALUES (?, ?)`,
            [tag.tag_id, currentTime],
            (err) => {
              if (err) {
                return reject(err);
              }
              resolve();
            }
          );
        });
      });

      Promise.all(insertPromises)
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });

    db.close((err) => {
      if (err) {
        logger.error("Failed to close the database connection:", err);
      }
    });
  });
}

const getTagsByPOIId = (poiId, db) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT tag.tag_name FROM tag
       JOIN POI_tag ON tag.tag_id = POI_tag.tag_id
       WHERE POI_tag.poi_id = ?`,
      [poiId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
};

const getRecommendationsByPOIId = (poiId, db) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT recommend_reason.reason, target_audience.target_audience FROM recommend_reason
       JOIN target_audience ON recommend_reason.target_audience_id = target_audience.id
       WHERE recommend_reason.poi_id = ?`,
      [poiId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
};

const getPOIById = (id) => {
  const db = new sqlite3.Database(dbPath);
  logger.info("Fetching POI by id:", id);
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT POI.*, parent.name as parent_name FROM POI
       LEFT JOIN POI as parent ON POI.parent_id = parent.id
       WHERE POI.id = ?`,
      [id],
      async (err, row) => {
        if (err) {
          reject(err);
        } else {
          try {
            const tags = await getTagsByPOIId(id, db);
            const recommendations = await getRecommendationsByPOIId(id, db);
            resolve({
              ...row,
              tags: tags || [],
              recommendations: recommendations || [],
            });
          } catch (error) {
            reject(error);
          }
        }
        db.close((err) => {
          if (err) {
            logger.error("Failed to close the database connection:", err);
          }
        });
      }
    );
  });
};

function fetchHistory() {
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    db.all("SELECT tag_id, used_time FROM history", [], (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });

    db.close((err) => {
      if (err) {
        logger.error("Failed to close the database connection:", err);
      }
    });
  });
}

function clearOldHistory(timestamp) {
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    db.run("DELETE FROM history WHERE used_time < ?", [timestamp], (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });

    db.close((err) => {
      if (err) {
        logger.error("Failed to close the database connection:", err);
      }
    });
  });
}

function insertTag(tagText) {
  const db = new sqlite3.Database(dbPath);
  const pinyinInitials = getPinyinInitials(tagText);

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO tag (tag_name, pinyin_initials) VALUES (?, ?)`,
      [tagText, pinyinInitials],
      function (err) {
        if (err) {
          return reject(err);
        }
        const newTagId = this.lastID;
        db.get(`SELECT * FROM tag WHERE tag_id = ?`, [newTagId], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      }
    );

    db.close((err) => {
      if (err) {
        console.error(err.message);
      }
    });
  });
}

// 查询数据库中要移除的这个Tag关联了多少个POI
function getPOICountByTag(tagText) {
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as count FROM POI_tag
       JOIN tag ON POI_tag.tag_id = tag.tag_id
       WHERE tag.tag_name = ?`,
      [tagText],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      }
    );

    db.close((err) => {
      if (err) {
        logger.error(err.message);
      }
    });
  });
}

function removeTag(tagText) {
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `DELETE FROM POI_tag WHERE tag_id IN (SELECT tag_id FROM tag WHERE tag_name = ?)`,
        [tagText],
        (err) => {
          if (err) {
            reject(err);
          }
        }
      );

      db.run(`DELETE FROM tag WHERE tag_name = ?`, [tagText], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    db.close((err) => {
      if (err) {
        logger.error(err.message);
      }
    });
  });
}

module.exports = {
  fetchTags,
  insertPOI,
  getPOILevel,
  fetchTargetAudience,
  searchPOIByName,
  searchPOIByExactName,
  getPOIsByTags,
  getPOIById,
  insertTag,
  insertHistoryWithTags,
  fetchHistory,
  clearOldHistory,
  getPOICountByTag,
  removeTag,
};
