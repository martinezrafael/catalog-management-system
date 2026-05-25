CREATE INDEX idx_products_price_cents ON products(price_cents);

CREATE INDEX idx_products_status ON products(status);

CREATE INDEX idx_products_attributes_gin ON products USING gin (attributes);

CREATE INDEX idx_product_categories_inverse ON product_categories(category_id, product_id);