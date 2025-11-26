CREATE TABLE IF NOT EXISTS `availability` (
    `availability_id` int(11)      NOT NULL auto_increment    COMMENT 'unique identifier for each availability entry',
    `participant_id`  int(11)      NOT NULL                   COMMENT 'participant this availability belongs to',
    `slot_id`         int(11)      NOT NULL                   COMMENT 'time slot that the participant is available for',
    `status`          varchar(15)  NOT NULL                   COMMENT 'status of slot (available, maybe, no)',
    PRIMARY KEY (`availability_id`),
    FOREIGN KEY (`participant_id`) REFERENCES `participants`(`participant_id`) ON DELETE CASCADE,
    FOREIGN KEY (`slot_id`) REFERENCES `slots`(`slot_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_participant_slot` (`participant_id`, `slot_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT="Contains participant availability for specific time slots";