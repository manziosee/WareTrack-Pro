CREATE TABLE IF NOT EXISTS "inventory_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"action" varchar(20) NOT NULL,
	"quantity" integer NOT NULL,
	"previous_quantity" integer NOT NULL,
	"new_quantity" integer NOT NULL,
	"order_id" integer,
	"notes" text,
	"performed_by" integer NOT NULL,
	"performed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"odometer_reading" integer,
	"next_service_odometer" integer,
	"next_service_date" timestamp,
	"performed_by" varchar(255),
	"notes" text,
	"scheduled_date" timestamp NOT NULL,
	"completed_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar(255) NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_order_id_delivery_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "delivery_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_history" ADD CONSTRAINT "inventory_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
