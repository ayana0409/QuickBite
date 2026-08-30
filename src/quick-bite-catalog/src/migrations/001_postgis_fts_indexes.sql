-- ============================================================
-- Migration: PostGIS + Full-Text Search Indexes for QuickBite
-- Run this script ONCE on your PostgreSQL database.
-- ============================================================

-- Enable required extensions in public schema explicitly
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- ----------------------------------------------------------
-- FIX [42P17]: unaccent() is STABLE by default, but PostgreSQL
-- requires index expression functions to be IMMUTABLE.
-- Solution: create an IMMUTABLE wrapper function (well-known pattern).
-- FIX [42883]: explicitly call public.unaccent to avoid search_path issues.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent', $1);
$$ LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE;

-- ----------------------------------------------------------
-- 1. Add PostGIS geometry column to restaurants table
-- ----------------------------------------------------------
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS location geometry(Point, 4326);

-- Sync existing JSONB geo coordinates to the new geometry column
-- address->'geo'->'coordinates' = [longitude, latitude]
UPDATE restaurants
SET location = ST_SetSRID(
  ST_MakePoint(
    (address -> 'geo' -> 'coordinates' ->> 0)::float,
    (address -> 'geo' -> 'coordinates' ->> 1)::float
  ), 4326
)
WHERE address -> 'geo' -> 'coordinates' IS NOT NULL
  AND jsonb_array_length(address -> 'geo' -> 'coordinates') = 2;

-- GIST Index for efficient spatial queries (ST_DWithin, ST_Distance)
CREATE INDEX IF NOT EXISTS "IDX_RESTAURANT_LOCATION_GIST"
  ON restaurants USING GIST (location);

-- ----------------------------------------------------------
-- 2. Full-Text Search GIN Index on food_items
-- Uses immutable_unaccent() wrapper (required by PostgreSQL)
-- to support Vietnamese diacritics (e.g. "bun bo" matches "bún bò").
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS "IDX_FOOD_ITEM_FTS_GIN"
  ON food_items USING GIN (
    to_tsvector(
      'simple',
      immutable_unaccent(name) || ' ' || immutable_unaccent(COALESCE(description, ''))
    )
  );

-- ----------------------------------------------------------
-- 3. Additional B-Tree indexes for filter performance
-- ----------------------------------------------------------
-- Price range filter (minPrice, maxPrice)
CREATE INDEX IF NOT EXISTS "IDX_FOOD_ITEM_PRICE_BTREE"
  ON food_items (price);

-- Trending score calculation (totalSold, rating)
CREATE INDEX IF NOT EXISTS "IDX_FOOD_ITEM_TRENDING_BTREE"
  ON food_items ("totalSold" DESC, rating DESC)
  WHERE "isAvailable" = true;

-- Category + availability filter
CREATE INDEX IF NOT EXISTS "IDX_FOOD_ITEM_CATEGORY_AVAILABLE"
  ON food_items ("categoryId", "isAvailable");

-- Restaurant + availability filter (for nearby query)
CREATE INDEX IF NOT EXISTS "IDX_FOOD_ITEM_RESTAURANT_AVAILABLE"
  ON food_items ("restaurantId", "isAvailable");

-- Verify
SELECT 'Migration completed successfully!' AS status;
