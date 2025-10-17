#!/usr/bin/env python3
"""
Prueba simple para Sales Management - importadoragenser.com
Versión simplificada para depuración
"""

from locust import HttpUser, task, between
import json

class SimpleSalesUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login al iniciar"""
        print("Iniciando login...")
        self.login()
        
    def login(self):
        """Login con credenciales reales"""
        login_data = {
            "usuario": "carlos_admin", 
            "password": "admin123"
        }
        
        print(f"Intentando login con: {login_data['usuario']}")
        print(f"Payload: {login_data}")
        
        with self.client.post(
            "/api/auth/login", 
            json=login_data,
            headers={'Content-Type': 'application/json'},
            catch_response=True
        ) as response:
            print(f"Login response status: {response.status_code}")
            print(f"Login response text: {response.text[:200]}...")
            
            if response.status_code == 200:
                try:
                    token_data = response.json()
                    self.token = token_data.get('token', '')
                    self.headers = {
                        'Authorization': f'Bearer {self.token}',
                        'Content-Type': 'application/json'
                    }
                    print(f"Login exitoso! Token: {self.token[:20]}...")
                    response.success()
                except Exception as e:
                    print(f"Error parseando respuesta: {e}")
                    response.failure(f"JSON parse error: {e}")
            else:
                print(f"Login falló: {response.status_code} - {response.text}")
                response.failure(f"Login failed: {response.status_code}")
    
    @task(3)
    def get_sales_simple(self):
        """Prueba simple para obtener ventas"""
        if not hasattr(self, 'headers'):
            print("No hay headers, reintentando login...")
            self.login()
            return
            
        print("Obteniendo lista de ventas...")
        
        try:
            response = self.client.get(
                "/api/ventas/pedidos",
                params={'limit': 10, 'page': 1},
                headers=self.headers,
                catch_response=True,
                name="get_sales"
            )
            
            print(f"Sales response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                sales_count = len(data.get('data', []))
                print(f"Ventas obtenidas: {sales_count}")
                response.success()
            elif response.status_code == 401:
                print("Token expirado, reintentando login...")
                self.login()
                response.failure("Token expired")
            else:
                print(f"Error obteniendo ventas: {response.status_code}")
                response.failure(f"HTTP {response.status_code}")
                
        except Exception as e:
            print(f"Error en request: {e}")
    
    @task(1)
    def health_check(self):
        """Verificar que la aplicación responda - usando endpoint del backend"""
        with self.client.get("/api/health", catch_response=True, name="health_check") as response:
            if response.status_code == 200:
                print("Health check OK")
                response.success()
            else:
                print(f"Health check failed: {response.status_code}")
                response.failure(f"Health check failed: {response.status_code}")


# Para debugging - ejecutar directamente
if __name__ == "__main__":
    print("Ejecutando prueba de debugging...")
    print("Usa: python -m locust -f simple_locust.py --host=http://localhost:3000")
    print("Luego ve a http://localhost:8089")