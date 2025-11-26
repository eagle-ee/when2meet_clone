CREATE TABLE IF NOT EXISTS `slots` (
    `slot_id`        int(11)       NOT NULL auto_increment    COMMENT 'unique identifier for each time slot',
    `event_id`       int(11)       NOT NULL                   COMMENT 'event this slot belongs to',
    `slot_date`      date          NOT NULL                   COMMENT 'date of this time slot',
    `slot_time`      time          NOT NULL                   COMMENT 'start time of this 30-minute slot',
    PRIMARY KEY (`slot_id`),
    FOREIGN KEY (`event_id`) REFERENCES `events`(`event_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_event_slot` (`event_id`, `slot_date`, `slot_time`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT="Contains all possible 30-minute time slots for events";