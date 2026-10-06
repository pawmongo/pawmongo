# Keep v1 database interactions strictly read-only

phpMongo v1.0.0 supports browsing, filtering, and viewing MongoDB documents without database mutations. This narrows the original CRUD and administration blueprint to a read-only product. Backend endpoints expose only validated read operations, including application-generated preview aggregation; user-submitted pipelines and mutation operations are excluded.
