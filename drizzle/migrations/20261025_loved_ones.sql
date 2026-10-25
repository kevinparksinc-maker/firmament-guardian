-- Apply to the configured MySQL database before deploying the loved-one storage change.
CREATE TABLE IF NOT EXISTS `loved_ones` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `openId` VARCHAR(64) NOT NULL,
  `payload` JSON NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `loved_ones_open_id_idx` (`openId`)
);
