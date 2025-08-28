Assignment 1 - REST API Project - Response to Criteria
================================================

Overview
------------------------------------------------

- **Name:** Junning Jia 
- **Student number:** n11789450 
- **Application name:** CAB432 Enhanced Video Processing Service 
- **Two line description:** This app runs a video transcoding process on videos that users have uploaded. 
Users can then view or download their original videos and the transcoded videos. 


Core criteria 
------------------------------------------------

### Containerise the app

- **ECR Repository name:** n11789450-cab432-video-processor
- **Video timestamp:** 00:11
- **Relevant files:**
    - /Dockerfile 
    - /docker-compose.yml 

### Deploy the container

- **EC2 instance ID:** i-0ebeb58dff692b8f5
- **Video timestamp:** 00:47

### User login

- **One line description:**  JWT-based authentication with hardcoded credentials for admin and user roles 
- **Video timestamp:** 01:51
- **Relevant files:**
    - /app.js 

### REST API

- **One line description:** REST API with endpoints (as nouns) and HTTP methods (GET, POST, PUT, DELETE), and appropriate status codes
- **Video timestamp:** 01:45 ; 02:38
- **Relevant files:**
    - /src/routes/jobs.js 
    - /app.js  
    - /src/controllers/jobs.js 

### Two kinds of data

#### First kind

- **One line description:** Video files
- **Type:** Unstructured
- **Rationale:** Videos are too large for database.  No need for additional functionality.
- **Video timestamp:** 03:10
- **Relevant files:**
    - /src/routes/jobs.js 
    - /uploads/ 
    - /processed/ 

#### Second kind

- **One line description:** File metadata
- **Type:** Structured
- **Rationale:** Requires querying, filtering, sorting capabilities
- **Video timestamp:** 03:19
- **Relevant files:**
    - /src/db.js 
    - /src/models/job.js 
    - /src/routes/jobs.js 

### CPU intensive task

 **One line description:** Ultra CPU-intensive video transcoding using FFmpeg
- **Video timestamp:** 03:39
- **Relevant files:**
    - /src/routes/jobs.js 

### CPU load testing

 **One line description:** Automated script generating concurrent video processing requests
- **Video timestamp:** 04:00
- **Relevant files:**
    - /load-test.js 

Additional criteria
------------------------------------------------

### Extensive REST API features

- **One line description:** API versioning, pagination, sorting, filter
- **Video timestamp:** 04:20
- **Relevant files:**
    - /src/routes/jobs.js 
    - /app.js

### Additional types of data

- **One line description:** configuration data - structured YAML and JSON files 
- **Video timestamp:** 03:30
- **Relevant files:**
    - /docker-compose.yml 

### Custom processing

- **One line description:** Custom CPU-intensive algorithms
- **Video timestamp:** 04:06
- **Relevant files:**
    - /src/controllers/jobs.js

### Web client 

- **One line description:** Complete web interface for authentication, video upload, job management with real-time status updates 
- **Video timestamp:** From 01:45
- **Relevant files:**
    - /public/index.html 
 