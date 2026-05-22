CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_price_cents ON products(price_cents);
CREATE INDEX idx_products_status ON products(status);

CREATE INDEX idx_products_attributes_gin ON products USING gin (attributes);