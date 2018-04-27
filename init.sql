SET NAMES 'utf8mb4';
SET CHARACTER SET utf8mb4;

CREATE TABLE feed (
  id INT NOT NULL AUTO_INCREMENT,
  url VARCHAR(255) NOT NULL,
  web_url VARCHAR(255) NOT NULL DEFAULT "",
  title VARCHAR(255) NOT NULL DEFAULT "",
  category VARCHAR(255) NOT NULL DEFAULT "uncategorized",
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (url),
  PRIMARY KEY (id)
);

CREATE TABLE item (
  id INT NOT NULL AUTO_INCREMENT,
  feed_id INT NOT NULL,
  title TEXT,
  url VARCHAR(255) NOT NULL,
  description TEXT,
  full_content TEXT NOT NULL DEFAULT "",
  header_image TEXT NOT NULL DEFAULT "",
  publish_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  read_state BOOLEAN DEFAULT FALSE NOT NULL,
  starred BOOLEAN DEFAULT FALSE NOT NULL,
  FOREIGN KEY (feed_id) REFERENCES feed(id) ON DELETE CASCADE,
  UNIQUE KEY (url),
  INDEX (publish_date),
  PRIMARY KEY (id)
);
