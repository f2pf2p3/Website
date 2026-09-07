## User Registration Flow

```text
script.js
   │
   │ username = "testuser"
   │ email = "test@gmail.com"
   │ password = "123456"
   ▼
POST /api/register
   │
   ▼
server.js
   │
   ├── bcrypt.hash(password, 10)
   │
   ▼
MySQL
   │
   ▼
users table
```

## Users Table

| Column | Type | Constraints |
|---|---|---|
| id | INT(11) | PRIMARY KEY, AUTO_INCREMENT |
| username | VARCHAR(500) | NOT NULL, UNIQUE |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password | VARCHAR(100) | NOT NULL |

## Q&A Section

Question: Why I have to seperate **Frontend server** and **Backend Server**?<br>
Answer: 

Question: What **Frontend server** do?<br>
Answer: 

Question: What **Backend server** do?<br>
Answer: 

Question: Why **Backend server port 5000** and **Frontend server port 3000**?<br>
Answer: 

Question: What is in **.env**?<br>
Answer: 

Question: How to **run localhost (Backend) server**?<br>
Answer: You **need XAMPP** to run MySQL for your backend database then run **node index.js** in terminal.

Question: do I need to **run localhost (Frontend server)**?<br>
Answer: 