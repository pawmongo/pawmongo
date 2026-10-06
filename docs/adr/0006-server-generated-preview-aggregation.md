# Compute read-only previews in MongoDB

The initial grid uses application-generated read-only aggregation to compute top-level scalar previews, nested-object labels, and array counts before data reaches PHP. This avoids loading complete documents merely to flatten them, at the cost of a more complex database query than find-only browsing. Users cannot submit pipelines, and write stages are excluded.
