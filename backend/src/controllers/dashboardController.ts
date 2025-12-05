import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CacheService } from '../services/cacheService';

const cache = CacheService.getInstance();

export class DashboardController {
  // Create system notifications
  static async createSystemNotifications() {
    try {
      // Check if welcome notification exists
      const existingWelcome = await prisma.notification.findFirst({
        where: { type: 'WELCOME' }
      });

      if (!existingWelcome) {
        await prisma.notification.create({
          data: {
            type: 'WELCOME',
            title: 'Welcome to WareTrack Pro!',
            message: 'Your warehouse management system is ready to use.',
            severity: 'INFO'
          }
        });
      }

      // Check if system update notification exists
      const existingUpdate = await prisma.notification.findFirst({
        where: { type: 'SYSTEM', title: 'System Update Complete' }
      });

      if (!existingUpdate) {
        await prisma.notification.create({
          data: {
            type: 'SYSTEM',
            title: 'System Update Complete',
            message: 'All system components have been successfully updated.',
            severity: 'SUCCESS',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
          }
        });
      }

      // Create low stock notifications
      const lowStockItems = await prisma.$queryRaw`
        SELECT id, name, quantity, min_quantity as "minQuantity"
        FROM inventory_items 
        WHERE quantity < min_quantity
      `;

      if (Array.isArray(lowStockItems)) {
        for (const item of lowStockItems) {
          const existingLowStock = await prisma.notification.findFirst({
            where: {
              type: 'LOW_STOCK',
              message: { contains: (item as any).name }
            }
          });

          if (!existingLowStock) {
            await prisma.notification.create({
              data: {
                type: 'LOW_STOCK',
                title: 'Low Stock Alert',
                message: `${(item as any).name} is running low (${(item as any).quantity} remaining)`,
                severity: 'WARNING'
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error creating system notifications:', error);
    }
  }
  static async getSummary(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        });
      }

      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Last week dates
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(today);
      
      const previousWeekStart = new Date(lastWeekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);
      const previousWeekEnd = new Date(lastWeekStart);

      // Current week data
      const [
        totalInventoryItems,
        totalInventoryValue,
        deliveriesToday,
        activeUsers,
        totalVehicles,
        lowStockItems
      ] = await Promise.all([
        prisma.inventoryItem.count(),
        prisma.inventoryItem.findMany({ select: { quantity: true, unitPrice: true } }),
        prisma.deliveryOrder.count({
          where: {
            status: 'DELIVERED',
            deliveredAt: { gte: today, lt: tomorrow }
          }
        }),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.vehicle.count(),
        prisma.$queryRaw`SELECT COUNT(*)::int as count FROM inventory_items WHERE quantity < min_quantity`
      ]);

      // Previous week data for comparison
      const [
        prevInventoryItems,
        prevDeliveries,
        prevActiveUsers,
        prevTotalVehicles,
        prevLowStockItems
      ] = await Promise.all([
        prisma.inventoryItem.count({
          where: {
            createdAt: { lt: lastWeekEnd }
          }
        }),
        prisma.deliveryOrder.count({
          where: {
            status: 'DELIVERED',
            deliveredAt: { gte: previousWeekStart, lt: previousWeekEnd }
          }
        }),
        prisma.user.count({
          where: {
            status: 'ACTIVE',
            createdAt: { lt: lastWeekEnd }
          }
        }),
        prisma.vehicle.count({
          where: {
            createdAt: { lt: lastWeekEnd }
          }
        }),
        prisma.$queryRaw`SELECT COUNT(*)::int as count FROM inventory_items WHERE quantity < min_quantity AND created_at < ${lastWeekEnd}`
      ]);

      // Calculate percentages
      const calculatePercentage = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const inventoryValue = Array.isArray(totalInventoryValue) 
        ? totalInventoryValue.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice)), 0)
        : 0;

      const lowStockCount = Array.isArray(lowStockItems) ? lowStockItems[0]?.count || 0 : 0;
      const prevLowStockCount = Array.isArray(prevLowStockItems) ? prevLowStockItems[0]?.count || 0 : 0;

      let summary: any = {
        totalInventory: {
          value: totalInventoryItems,
          percentage: calculatePercentage(totalInventoryItems, prevInventoryItems)
        },
        deliveriesToday: {
          value: deliveriesToday,
          percentage: calculatePercentage(deliveriesToday, prevDeliveries)
        },
        activeUsers: {
          value: activeUsers,
          percentage: calculatePercentage(activeUsers, prevActiveUsers)
        },
        fleetStatus: {
          value: totalVehicles,
          percentage: calculatePercentage(totalVehicles, prevTotalVehicles)
        },
        systemAlerts: {
          value: lowStockCount,
          percentage: calculatePercentage(lowStockCount, prevLowStockCount)
        },
        totalInventoryValue: inventoryValue,
        currency: 'RWF',
        userRole: user.role
      };

      // Add role-specific data
      if (user.role === 'DISPATCH_OFFICER') {
        const [pendingDispatches, inTransitDispatches, completedTodayDispatches, availableDrivers, availableVehicles, onRouteVehicles, maintenanceVehicles, urgentOrders, scheduledPickups] = await Promise.all([
          // Pending dispatches
          prisma.dispatch.count({
            where: { status: 'PENDING' }
          }),
          // In transit dispatches
          prisma.dispatch.count({
            where: { status: 'IN_TRANSIT' }
          }),
          // Completed today
          prisma.dispatch.count({
            where: {
              status: 'DELIVERED',
              actualDelivery: { gte: today, lt: tomorrow }
            }
          }),
          // Available drivers
          prisma.driver.count({
            where: { status: 'AVAILABLE' }
          }),
          // Available vehicles
          prisma.vehicle.count({
            where: { status: 'AVAILABLE' }
          }),
          // On route vehicles
          prisma.vehicle.count({
            where: { status: 'IN_USE' }
          }),
          // Maintenance vehicles
          prisma.vehicle.count({
            where: { status: 'MAINTENANCE' }
          }),
          // Urgent orders
          prisma.deliveryOrder.count({
            where: {
              priority: 'HIGH',
              status: { in: ['PENDING', 'DISPATCHED'] }
            }
          }),
          // Scheduled pickups
          prisma.deliveryOrder.count({
            where: {
              status: 'PENDING',
              scheduledDate: { gte: today, lt: tomorrow }
            }
          })
        ]);

        // Calculate previous day counts for percentage changes
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const [prevPendingDispatches, prevInTransitDispatches, prevCompletedDispatches, prevAvailableDrivers] = await Promise.all([
          prisma.dispatch.count({
            where: {
              status: 'PENDING',
              createdAt: { gte: yesterday, lt: today }
            }
          }),
          prisma.dispatch.count({
            where: {
              status: 'IN_TRANSIT',
              createdAt: { gte: yesterday, lt: today }
            }
          }),
          prisma.dispatch.count({
            where: {
              status: 'DELIVERED',
              actualDelivery: { gte: yesterday, lt: today }
            }
          }),
          prisma.driver.count({
            where: {
              status: 'AVAILABLE',
              createdAt: { lt: today }
            }
          })
        ]);

        summary.dispatchStats = {
          pendingDispatches: {
            value: pendingDispatches,
            percentage: calculatePercentage(pendingDispatches, prevPendingDispatches)
          },
          inTransit: {
            value: inTransitDispatches,
            percentage: calculatePercentage(inTransitDispatches, prevInTransitDispatches)
          },
          completedToday: {
            value: completedTodayDispatches,
            percentage: calculatePercentage(completedTodayDispatches, prevCompletedDispatches)
          },
          availableDrivers: {
            value: availableDrivers,
            percentage: calculatePercentage(availableDrivers, prevAvailableDrivers)
          },
          fleetStatus: {
            availableVehicles,
            onRouteVehicles,
            maintenanceVehicles
          },
          todayPriority: {
            urgentDeliveries: urgentOrders,
            scheduledPickups,
            routeOptimizations: Math.floor(Math.random() * 3) + 1 // Mock data for route optimizations
          }
        };
      } else if (user.role === 'DRIVER') {
        const driverRecord = await prisma.driver.findFirst({ where: { userId: user.id } });
        if (driverRecord) {
          const [todayDeliveries, remainingDeliveries, currentDelivery, todaySchedule] = await Promise.all([
            // Completed today
            prisma.dispatch.count({
              where: {
                driverId: driverRecord.id,
                status: 'DELIVERED',
                actualDelivery: { gte: today, lt: tomorrow }
              }
            }),
            // Remaining deliveries
            prisma.dispatch.count({
              where: {
                driverId: driverRecord.id,
                status: { in: ['PENDING', 'DISPATCHED', 'IN_TRANSIT'] }
              }
            }),
            // Current delivery
            prisma.dispatch.findFirst({
              where: {
                driverId: driverRecord.id,
                status: 'IN_TRANSIT'
              },
              include: {
                order: {
                  include: {
                    items: {
                      include: { item: true }
                    }
                  }
                }
              }
            }),
            // Today's schedule
            prisma.dispatch.findMany({
              where: {
                driverId: driverRecord.id,
                scheduledDate: { gte: today, lt: tomorrow }
              },
              include: { order: true },
              orderBy: { scheduledDate: 'asc' }
            })
          ]);

          // Calculate total distance and earnings for today
          const todayDistance = todaySchedule.reduce((total, dispatch) => {
            return total + (Math.random() * 20 + 5); // Mock distance calculation
          }, 0);

          const todayEarnings = todaySchedule
            .filter(d => d.status === 'DELIVERED')
            .reduce((total, dispatch) => {
              return total + (Number(dispatch.order.totalAmount) * 0.1); // 10% commission
            }, 0);

          summary.driverStats = {
            completedToday: todayDeliveries,
            remaining: remainingDeliveries,
            distance: Math.round(todayDistance),
            earnings: Math.round(todayEarnings),
            currentDelivery: currentDelivery ? {
              status: currentDelivery.status,
              orderNumber: currentDelivery.order.orderNumber,
              customerName: currentDelivery.order.customerName,
              deliveryAddress: currentDelivery.order.deliveryAddress,
              customerPhone: currentDelivery.order.contactNumber,
              eta: currentDelivery.estimatedDelivery,
              items: currentDelivery.order.items?.map(item => ({
                name: item.item.name,
                quantity: item.quantity
              })) || []
            } : null,
            todaySchedule: todaySchedule.map(dispatch => ({
              orderNumber: dispatch.order.orderNumber,
              status: dispatch.status,
              time: dispatch.status === 'DELIVERED' ? dispatch.actualDelivery : 
                    dispatch.status === 'IN_TRANSIT' ? dispatch.estimatedDelivery :
                    dispatch.scheduledDate,
              customerName: dispatch.order.customerName
            }))
          };
        }
      }

      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Dashboard summary error:', error);
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }

  static async getActivity(req: Request, res: Response) {
    try {
      // Get real recent activities from database
      const [recentOrders, recentInventoryUpdates, deliveredOrders] = await Promise.all([
        prisma.deliveryOrder.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: { createdByUser: true }
        }),
        prisma.inventoryHistory.findMany({
          take: 3,
          orderBy: { performedAt: 'desc' },
          include: { 
            item: true,
            performedByUser: true
          }
        }),
        prisma.deliveryOrder.findMany({
          where: { status: 'DELIVERED' },
          take: 3,
          orderBy: { deliveredAt: 'desc' },
          include: { driver: { include: { user: true } } }
        })
      ]);

      const activities = [];

      // Add order activities
      recentOrders.forEach(order => {
        activities.push({
          id: `order_${order.id}`,
          type: 'order_created',
          message: `New order ${order.orderNumber} from ${order.customerName}`,
          timestamp: order.createdAt,
          user: order.createdByUser?.name || 'System'
        });
      });

      // Add inventory activities
      recentInventoryUpdates.forEach(update => {
        activities.push({
          id: `inventory_${update.id}`,
          type: 'inventory_updated',
          message: `${update.item.name} stock ${update.action} (${update.quantity} units)`,
          timestamp: update.performedAt,
          user: update.performedByUser?.name || 'System'
        });
      });

      // Add delivery activities
      deliveredOrders.forEach(order => {
        activities.push({
          id: `delivery_${order.id}`,
          type: 'order_delivered',
          message: `Order ${order.orderNumber} delivered successfully`,
          timestamp: order.deliveredAt || order.updatedAt,
          user: order.driver?.name || 'Driver'
        });
      });

      // Sort by timestamp and take latest 10
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
      
      res.json({ success: true, data: sortedActivities });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getUpcoming(req: Request, res: Response) {
    try {
      const upcomingOrders = await prisma.deliveryOrder.findMany({
        where: { status: 'PENDING' },
        take: 5,
        include: { 
          driver: true,
          vehicle: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json({ success: true, data: upcomingOrders });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' }
      });
    }
  }

  static async getTrends(req: Request, res: Response) {
    try {
      const { period = '7' } = req.query;
      const days = parseInt(period as string) || 7;
      
      const trends = [];
      const today = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const [completed, pending, cancelled] = await Promise.all([
          prisma.deliveryOrder.count({
            where: {
              status: 'DELIVERED',
              deliveredAt: { gte: date, lt: nextDay }
            }
          }),
          prisma.deliveryOrder.count({
            where: {
              status: 'PENDING',
              createdAt: { gte: date, lt: nextDay }
            }
          }),
          prisma.deliveryOrder.count({
            where: {
              status: 'CANCELLED',
              updatedAt: { gte: date, lt: nextDay }
            }
          })
        ]);
        
        trends.push({
          date: date.toISOString().split('T')[0],
          completed,
          pending,
          cancelled
        });
      }

      res.json({ success: true, data: trends });
    } catch (error) {
      console.error('Trends error:', error);
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }

  static async getNotifications(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.userId);
      
      // Ensure system notifications exist
      await DashboardController.createSystemNotifications();
      
      // Get stored notifications for user (or global ones)
      const notifications = await prisma.notification.findMany({
        where: {
          OR: [
            { userId: userId },
            { userId: null } // Global notifications
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      const formattedNotifications = notifications.map(notification => ({
        id: notification.id.toString(),
        type: notification.type.toLowerCase(),
        title: notification.title,
        message: notification.message,
        timestamp: notification.createdAt,
        timeAgo: getTimeAgo(notification.createdAt),
        severity: notification.severity.toLowerCase(),
        read: notification.read
      }));

      res.json({ success: true, data: formattedNotifications });
    } catch (error) {
      console.error('Notifications error:', error);
      res.json({ success: true, data: [] });
    }
  }

  static async getAlerts(req: Request, res: Response) {
    try {
      const lowStockItems = await prisma.$queryRaw`
        SELECT * FROM inventory_items WHERE quantity < min_quantity
      `;

      const alerts = (lowStockItems as any[]).map((item: any) => ({
        id: item.id,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${item.name} is running low (${item.quantity} units left)`,
        severity: 'warning',
        timestamp: new Date(),
        timeAgo: getTimeAgo(item.last_updated || new Date())
      }));

      res.json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }



  static async getInventoryByCategory(req: Request, res: Response) {
    try {
      const inventoryByCategory = await prisma.inventoryItem.groupBy({
        by: ['category'],
        _count: { id: true },
        _sum: { quantity: true }
      });

      const categoryData = inventoryByCategory.map(item => ({
        category: item.category || 'Uncategorized',
        count: item._count.id,
        totalQuantity: item._sum.quantity || 0
      }));

      res.json({ success: true, data: categoryData });
    } catch (error) {
      console.error('Inventory by category error:', error);
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }

  static async getRecentOrders(req: Request, res: Response) {
    try {
      const { limit = 10 } = req.query;
      
      const recentOrders = await prisma.deliveryOrder.findMany({
        take: parseInt(limit as string) || 10,
        orderBy: { createdAt: 'desc' },
        include: {
          driver: { select: { name: true } },
          vehicle: { select: { plateNumber: true } },
          createdByUser: { select: { name: true } }
        }
      });

      const formattedOrders = recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        status: order.status,
        totalAmount: `RWF ${Number(order.totalAmount).toLocaleString()}`,
        createdAt: order.createdAt,
        driver: order.driver?.name || 'Not assigned',
        vehicle: order.vehicle?.plateNumber || 'Not assigned',
        createdBy: order.createdByUser?.name || 'System'
      }));

      res.json({ success: true, data: formattedOrders });
    } catch (error) {
      console.error('Recent orders error:', error);
      res.status(500).json({ 
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Server error'
        }
      });
    }
  }
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - new Date(date).getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
}