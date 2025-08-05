USE panorama_map;
ALTER TABLE kml_file_styles
MODIFY COLUMN point_color VARCHAR(32),
MODIFY COLUMN point_label_color VARCHAR(32),
MODIFY COLUMN line_color VARCHAR(32),
MODIFY COLUMN polygon_fill_color VARCHAR(32),
MODIFY COLUMN polygon_stroke_color VARCHAR(32),
MODIFY COLUMN cluster_icon_color VARCHAR(32),
MODIFY COLUMN cluster_text_color VARCHAR(32);
