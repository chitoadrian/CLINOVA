-- Cambio solicitado únicamente para la contraseña de matias.
UPDATE credentials SET password_hash='0edc06715adbafb8a93b2be6fcb30f6606bde312b3ae9b733903595e4dcf467f',salt='60544c271bf7153b8412b34e47b3bc08',iterations=600000,failed_attempts=0,locked_until=0 WHERE user_id IN (SELECT id FROM users WHERE username='matias');
UPDATE users SET version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE username='matias';
