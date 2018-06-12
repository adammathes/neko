CREATE TABLE IF NOT EXISTS "feed" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "url" varchar(100) NOT NULL UNIQUE,
  "web_url" varchar(255) NOT NULL DEFAULT '',
  "title" varchar(255) NOT NULL DEFAULT '',
  "last_updated" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "category" varchar(255) NOT NULL DEFAULT 'uncategorized'
);
CREATE INDEX "feed_url" ON "feed" ("url");
CREATE INDEX "feed_category" ON "feed" ("category");
CREATE INDEX "feed_id" ON "feed" ("id");

CREATE TABLE IF NOT EXISTS "item" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "feed_id" int(11) NOT NULL,
  "title" text NOT NULL DEFAULT '',
  "url" varchar(255) NOT NULL UNIQUE,
  "description" text NOT NULL DEFAULT '',
  "publish_date" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_state" tinyint(1) NOT NULL DEFAULT '0',
  "starred" tinyint(1) NOT NULL DEFAULT '0',
  "full_content" text NOT NULL DEFAULT '',
  "header_image" text NOT NULL DEFAULT '',
  CONSTRAINT "item_ibfk_1" FOREIGN KEY ("feed_id") REFERENCES "feed" ("id") ON DELETE CASCADE
);
CREATE INDEX "item_url" ON "item" ("url");
CREATE INDEX "item_publish_date" ON "item" ("publish_date");
CREATE INDEX "item_feed_id" ON "item" ("feed_id");
CREATE INDEX "item_rev_id" ON "item" ("id");
CREATE INDEX "item_read_state" ON "item" ("read_state");
