-- Rotación individual de credenciales, sin modificar roles ni datos clínicos.
UPDATE credentials SET password_hash='800375895e6e7a708f178732f0c6fcc4de5e0906833b0f46dcba89bde18e5497',salt='733b535d8fee639dc0d148c2fdc40871',iterations=600000,failed_attempts=0,locked_until=0 WHERE user_id IN (SELECT id FROM users WHERE username='jeshua');
UPDATE users SET version=version+1 WHERE username='jeshua';
UPDATE credentials SET password_hash='c6d5b281a0c80e5fcfa064ce13ab946bf8b1d56415fe15c061ec6b7714042050',salt='073171c1cc8f5d5a4c361a73aef9f46f',iterations=600000,failed_attempts=0,locked_until=0 WHERE user_id IN (SELECT id FROM users WHERE username='wilson');
UPDATE users SET version=version+1 WHERE username='wilson';
UPDATE credentials SET password_hash='85a1a5c320ce9e19ef427f428714248f292bb2d14eb25817fd4fd6e862c5f17f',salt='98dbf638e3d80e75d296a4ac704f2d96',iterations=600000,failed_attempts=0,locked_until=0 WHERE user_id IN (SELECT id FROM users WHERE username='adrian');
UPDATE users SET version=version+1 WHERE username='adrian';
UPDATE credentials SET password_hash='0aad10ae06904ad0bf2990b36dd09c386e8905f17df2c279d1b78e32266d2644',salt='053b4a8cfe062c86e021bf39b34dbc85',iterations=600000,failed_attempts=0,locked_until=0 WHERE user_id IN (SELECT id FROM users WHERE username='matias');
UPDATE users SET version=version+1 WHERE username='matias';
