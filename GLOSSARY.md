# phpMongo

phpMongo is a browser-based MongoDB administration tool for a private installation.

## Language

**Administrator**:
The single person who operates a phpMongo installation and uses it to administer MongoDB databases.
_Avoid_: Tenant, customer

**Master password**:
The administrator's password for accessing phpMongo, separate from MongoDB credentials. It must be entered before any MongoDB credentials can be supplied.
_Avoid_: Database password

**Read-only browsing**:
Viewing and filtering MongoDB documents without changing documents or database structures. This is the database interaction scope for v1.0.0.

**Document preview**:
A compact view of a document's top-level values, with summaries for nested content and explicit indications when content is omitted.
_Avoid_: Full document

**Document detail**:
An expanded view of one selected document, with bounded content and explicit indications of any truncation.
_Avoid_: Unrestricted document

**Sponsorship placement**:
A designated area that displays sponsorship content in phpMongo's login panel, sidebar, or repository README. All three zones are required in v1.0.0 and must contain fallback content when no sponsor is configured.
_Avoid_: Sponsorship engine

**Collection creation**:
The explicit authenticated action that creates an empty ordinary MongoDB collection, subject to database permissions. Document browsing remains read-only.

**Theme**:
A display preference selected from Sage, Ocean, Sand, and Midnight. Only this preference may be stored in the browser; database credentials stay in encrypted server-side sessions.
