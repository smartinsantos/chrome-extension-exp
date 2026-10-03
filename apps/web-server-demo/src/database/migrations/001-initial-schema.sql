-- Boards contain ordered lists; lists contain ordered cards; labels belong to a board.

CREATE TABLE boards (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  created_at TEXT NOT NULL
);

CREATE TABLE board_lists (
  id         TEXT PRIMARY KEY,
  board_id   TEXT NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  position   INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX board_lists_by_board ON board_lists (board_id, position);

CREATE TABLE labels (
  id       TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
  name     TEXT NOT NULL CHECK (length(trim(name)) > 0),
  color    TEXT NOT NULL,
  UNIQUE (board_id, name COLLATE NOCASE)
);

CREATE TABLE cards (
  id              TEXT PRIMARY KEY,
  list_id         TEXT NOT NULL REFERENCES board_lists (id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description     TEXT NOT NULL DEFAULT '',
  due_date        TEXT,                              -- YYYY-MM-DD, or NULL for no due date
  is_due_complete INTEGER NOT NULL DEFAULT 0,        -- 1 once the work is done (never overdue)
  position        INTEGER NOT NULL,                  -- 0-based order among the list's active cards
  archived_at     TEXT,                              -- NULL while the card is active
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX cards_by_list ON cards (list_id, archived_at, position);

CREATE TABLE card_labels (
  card_id  TEXT NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES labels (id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);
