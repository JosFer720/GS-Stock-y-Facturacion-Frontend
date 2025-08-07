-- Insertar nuevos usuarios en la tabla Usuarios
INSERT INTO Usuarios (Id_Roles, Nombre, Apellido, Email)
VALUES 
(2, 'Jose', 'López', 'jlopez2018ig@gmail.com'),
(3, 'Genser', 'Catalán', 'cat23401@uvg.edu.gt'),
(4, 'Hugo', 'Barillas', 'bar23306@uvg.edu.gt')
ON CONFLICT DO NOTHING;

INSERT INTO Cuentas_Usuarios (Id_Usuarios, Usuario, Contrasena) VALUES
(5, 'jose_lopez',    '$2b$10$dMI7q44DTIzxSeGxJgZTyuGrBLGeMKDExFVjR.A0Tf1.LW2ZrIn.C'), 
(6, 'genser_catalan','$2b$10$6Xt/n3RjO7bfx7QQay9Z8OTd5T.2M0RL7Tj8kK98WcMXTuSSGscEK'), 
(7, 'hugo_barillas', '$2b$10$3AYftZ/ClL/HHFV0qD67NOULvLqx9.PPQuWktF/v4fz6d6Bg70vaS')  
ON CONFLICT DO NOTHING;

