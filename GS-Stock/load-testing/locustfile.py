#!/usr/bin/env python3
"""
Prueba de estrés para importadoragenser.com
Endpoint: Sales Management - Lista de ventas
"""

from locust import HttpUser, task, between
import json
import random
import time

class SalesManagementUser(HttpUser):
    """
    Simula usuarios accediendo al sistema de gestión de ventas
    """
    wait_time = between(1, 3)  # Espera entre 1-3 segundos entre requests
    
    def on_start(self):
        """Se ejecuta cuando inicia cada usuario simulado"""
        self.login()
        
    def login(self):
        """Simula el login de usuario para obtener JWT token"""
        login_data = {
            "usuario": "carlos_admin",
            "password": "admin123"
        }
        
        with self.client.post(
            "/api/auth/login", 
            json=login_data,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    token_data = response.json()
                    self.token = token_data.get('token', '')
                    self.headers = {
                        'Authorization': f'Bearer {self.token}',
                        'Content-Type': 'application/json'
                    }
                    response.success()
                except Exception as e:
                    response.failure(f"Login failed: {e}")
            else:
                response.failure(f"Login failed with status: {response.status_code}")
    
    @task(5)  # Peso 5 - tarea más común
    def get_sales_list(self):
        """Obtiene la lista de ventas (GET /api/ventas/pedidos)"""
        params = {
            'limit': random.choice([5, 10, 20]),
            'page': random.randint(1, 5)
        }
        
        with self.client.get(
            "/api/ventas/pedidos",
            params=params,
            headers=getattr(self, 'headers', {}),
            catch_response=True,
            name="get_sales_list"
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if 'data' in data and isinstance(data['data'], list):
                        response.success()
                    else:
                        response.failure("Invalid response format")
                except json.JSONDecodeError:
                    response.failure("Invalid JSON response")
            elif response.status_code == 401:
                response.failure("Authentication failed")
                self.login()  # Reintentar login
            else:
                response.failure(f"HTTP {response.status_code}")
    
    @task(3)  # Peso 3
    def get_sales_with_filters(self):
        """Obtiene ventas con filtros aplicados"""
        # Simula filtros que se aplicarían desde el frontend
        params = {
            'limit': 10,
            'page': 1,
            'date_from': '2024-01-01',
            'date_to': '2024-12-31',
        }
        
        with self.client.get(
            "/api/ventas/pedidos",
            params=params,
            headers=getattr(self, 'headers', {}),
            catch_response=True,
            name="get_sales_filtered"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Filter request failed: {response.status_code}")
    
    @task(2)  # Peso 2
    def get_sale_details(self):
        """Simula ver detalles de una venta específica"""
        # Primero obtiene una lista para tener IDs reales
        with self.client.get(
            "/api/ventas/pedidos",
            params={'limit': 5, 'page': 1},
            headers=getattr(self, 'headers', {}),
            catch_response=True,
            name="get_sales_for_details"
        ) as list_response:
            
            if list_response.status_code == 200:
                try:
                    data = list_response.json()
                    sales = data.get('data', [])
                    
                    if sales:
                        # Selecciona una venta aleatoria
                        sale = random.choice(sales)
                        sale_id = sale.get('id')
                        
                        if sale_id:
                            # Obtiene los detalles de la venta
                            with self.client.get(
                                f"/api/ventas/pedidos/{sale_id}/productos",
                                headers=getattr(self, 'headers', {}),
                                catch_response=True,
                                name="get_sale_details"
                            ) as detail_response:
                                if detail_response.status_code == 200:
                                    detail_response.success()
                                else:
                                    detail_response.failure(f"Details failed: {detail_response.status_code}")
                        else:
                            list_response.failure("No sale ID found")
                    else:
                        list_response.failure("No sales data")
                        
                except json.JSONDecodeError:
                    list_response.failure("Invalid JSON in sales list")
            else:
                list_response.failure(f"Sales list failed: {list_response.status_code}")
    
    @task(1)  # Peso 1 - menos frecuente
    def get_estados_pedidos(self):
        """Obtiene los estados de pedidos disponibles"""
        with self.client.get(
            "/api/ventas/estados-pedidos",
            headers=getattr(self, 'headers', {}),
            catch_response=True,
            name="get_order_statuses"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Status request failed: {response.status_code}")
    
    @task(1)
    def get_tipos_linea_producto(self):
        """Obtiene los tipos de línea de producto"""
        with self.client.get(
            "/api/ventas/tipos-linea-producto",
            headers=getattr(self, 'headers', {}),
            catch_response=True,
            name="get_product_lines"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Product lines request failed: {response.status_code}")


class HeavyLoadUser(HttpUser):
    """
    Usuario para cargas más pesadas - simula operaciones más intensivas
    """
    wait_time = between(0.5, 1.5)  # Más agresivo
    
    def on_start(self):
        self.login()
        
    def login(self):
        login_data = {
            "usuario": "carlos_admin",
            "password": "admin123"
        }
        
        response = self.client.post("/api/auth/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            self.token = token_data.get('token', '')
            self.headers = {
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
    
    @task
    def rapid_sales_requests(self):
        """Hace múltiples requests rápidos simulando uso intensivo"""
        for i in range(3):  # 3 requests seguidos
            params = {
                'limit': random.choice([10, 20, 50]),
                'page': random.randint(1, 10)
            }
            
            self.client.get(
                "/api/ventas/pedidos",
                params=params,
                headers=getattr(self, 'headers', {}),
                name=f"rapid_request_{i}"
            )
            time.sleep(0.1)  # Pequeña pausa entre requests


# Configuración para diferentes escenarios de carga
class PeakHourUser(SalesManagementUser):
    """Simula usuarios en hora pico"""
    wait_time = between(0.5, 2)  # Más actividad
    
class RegularUser(SalesManagementUser):
    """Usuario regular con patrones normales"""
    wait_time = between(2, 5)  # Uso más espaciado