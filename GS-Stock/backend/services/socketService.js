class SocketService {
  constructor(io) {
    this.io = io;
  }

  //Emitir eventos al cambiar inventario
  emitInventoryUpdate(inventoryData) {
    console.log('Emitiendo actualización de inventario:', inventoryData);
    
    this.io.to('inventory').emit('inventory_updated', {
      type: 'INVENTORY_UPDATE',
      data: inventoryData,
      timestamp: new Date().toISOString()
    });
  }

  //Emitir cuando se agrega nuevo producto
  emitNewProduct(product) {
    console.log('Emitiendo nuevo producto:', product);
    
    this.io.to('inventory').emit('product_added', {
      type: 'PRODUCT_ADDED',
      data: product,
      timestamp: new Date().toISOString()
    });
  }

  //Emitir cuando se actualiza stock de un producto
  emitStockUpdate(productId, newStock, previousStock) {
    console.log(`Emitiendo actualización de stock para producto ${productId}`);
    
    this.io.to('inventory').emit('stock_updated', {
      type: 'STOCK_UPDATE',
      data: {
        productId,
        newStock,
        previousStock,
        difference: newStock - previousStock
      },
      timestamp: new Date().toISOString()
    });
  }

  //Emitir eventos al registrar nueva venta
  emitNewSale(saleData) {
    console.log('Emitiendo nueva venta:', saleData);
    
    // Emitir a sala de ventas
    this.io.to('sales').emit('sale_registered', {
      type: 'NEW_SALE',
      data: saleData,
      timestamp: new Date().toISOString()
    });

    //Emitir a sala de inventario para actualizar stock
    this.io.to('inventory').emit('sale_affecting_inventory', {
      type: 'SALE_INVENTORY_IMPACT',
      data: {
        saleId: saleData.id,
        products: saleData.products, 
        totalAmount: saleData.total
      },
      timestamp: new Date().toISOString()
    });
  }

  //Emitir alerta de stock bajo
  emitLowStockAlert(product) {
    console.log('Emitiendo alerta de stock bajo:', product);
    
    this.io.to('inventory').emit('low_stock_alert', {
      type: 'LOW_STOCK_ALERT',
      data: {
        productId: product.id,
        productName: product.name,
        currentStock: product.stock,
        minimumStock: product.minimum_stock || 5
      },
      timestamp: new Date().toISOString()
    });
  }

  //Emitir error de sobreventa
  emitOversaleError(productId, requestedQuantity, availableStock) {
    console.log('Emitiendo error de sobreventa');
    
    this.io.to('sales').emit('oversale_error', {
      type: 'OVERSALE_ERROR',
      data: {
        productId,
        requestedQuantity,
        availableStock,
        message: `Stock insuficiente. Solicitado: ${requestedQuantity}, Disponible: ${availableStock}`
      },
      timestamp: new Date().toISOString()
    });
  }

  //Emitir estadísticas en tiempo real
  emitRealTimeStats(stats) {
    this.io.emit('real_time_stats', {
      type: 'REAL_TIME_STATS',
      data: stats,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = SocketService;