const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = 4000;

// Middleware for parsing JSON and form data
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL connection setup
const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root@123",
  database: "leave_management"
});

con.connect(function (err) {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    return;
  }
  console.log("Connected to MySQL database!");
});

// Login service
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const query = "SELECT * FROM employee WHERE username = ? AND password = ?";
  con.query(query, [username, password], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error during login", success: false });
    }

    if (results.length > 0) {
      res.status(200).json({ message: "Login successful", user: results[0], success: true });
    } else {
      res.status(200).json({ message: "Invalid username or password", success: false });
    }
  });
});

// My Profile service
app.post('/myprofile', (req, res) => {
  const { emp_id } = req.body;

  const query = `
    SELECT *, firstname AS fn, lastname AS ln, 
           CONCAT(firstname, ' ', lastname) AS full_name 
    FROM employee 
    WHERE emp_id = ? AND active = 1`;

  con.query(query, [emp_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching profile", success: false });
    }

    if (results.length > 0) {
      res.status(200).json({ message: "Successful", user: results[0], success: true });
    } else {
      res.status(200).json({ message: "Invalid Employee", success: false });
    }
  });
});



app.post("/applistsearch", (req, res) => {
  const { emp_id, searchQuery } = req.body;

  // Sanitize the searchQuery for SQL injection protection
  const sanitizedSearchQuery = searchQuery ? ` AND lt.leave_type_terms regexp ? ${searchQuery}` : '';

  // SQL Query to filter leave types EL, SL, VL, or LWOP
  const query = `SELECT r.*, lt.leave_type_terms
    FROM records r
    JOIN leave_type lt ON r.leave_type_id = lt.leave_type_id
    WHERE r.emp_id = ? and r.active=1`;

  // Query execution
  con.query(query, [emp_id, sanitizedSearchQuery], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Error fetching records." });
    }
    res.json({ success: true, data: results });
  });
});



// Leave Credit service
app.post('/leavecredit', (req, res) => {
  const query = "SELECT * FROM leave_type WHERE active = 1";

  con.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching leave credit", success: false });
    }

    if (results.length > 0) {
      res.status(200).json({ message: "Query Results", data: results, success: true });
    } else {
      res.status(200).json({ message: "No active leave types found", success: false });
    }
  });
});



// Records service
app.post('/records', (req, res) => {
  const query = `
    SELECT r.records_id, r.emp_id, r.leave_type_id, lt.leave_type AS leave_type_name, 
           r.day_type, r.start_date, r.total_days, r.active, r.reasons, 
           CONCAT(lt.leave_type, '-', lt.leave_type_terms) AS leave_full_name  
    FROM records r 
    INNER JOIN leave_type lt ON r.leave_type_id = lt.leave_type_id
    where r.active=1 `;

  con.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching records", success: false });
    }

    if (results.length > 0) {
      res.status(200).json({ message: "Query Results", data: results, success: true });
    } else {
      res.status(200).json({ message: "No records found", success: false });
    }
  });
});

// Applications List (Joining Tables) service
app.post('/applist', (req, res) => {

  const query = "select * from records join leave_type on leave_type.leave_type_id = records.leave_type_id where records.active=1; "

  con.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching application list", success: false });
    }

    if (results.length > 0) {
      res.status(200).json({ message: "Query Results", data: results, success: true });
    } else {
      res.status(200).json({ message: "No applications found", success: false });
    }
  });
});



app.post('/newrecords', (req, res) => {
  console.log(req.body);

  const { emp_id, leave_type_id, day_type, start_date, end_date, total_days, reasons, leave_status, active } = req.body;
  const query = "insert into records (emp_id,leave_type_id,day_type,start_date,end_date,total_days,reasons,leave_status,active,created_by,updated_by) values (?,?,?,?,?,?,?,?,?,?,?) ";

  con.query(query, [emp_id, leave_type_id, day_type, start_date, end_date, total_days, reasons, leave_status, active, emp_id, emp_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching application list", success: false });
    }
    console.log(results.affectedRows);

    if (results.affectedRows > 0) {
      res.status(200).json({ message: "Query Results", success: true });
    } else {
      res.status(200).json({ message: "No applications found", success: false });
    }
  });
});





app.post('/updatefetch', (req, res) => {
  const { records_id } = req.body;
  const query = "select * from records where records_id=? AND active=1";

  con.query(query, [records_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching profile", success: false });
    }

    if (results.length > 0) {
      res.status(200).json({ message: "Successful", user: results[0], success: true });
    } else {
      res.status(200).json({ message: "Invalid Employee", success: false });
    }
  });
});





app.post('/editrecords', (req, res) => {
  const { records_id, leave_type_id, day_type, start_date, end_date, total_days, reasons, leave_status, emp_id } = req.body;

  if (!records_id || !emp_id) {
    return res.status(400).json({ message: "Missing required fields: records_id or emp_id", success: false });
  }

  const query = `
    UPDATE records 
    SET leave_type_id = ?, day_type = ?, start_date = ?, end_date = ?, total_days = ?, reasons = ?, leave_status = ?, updated_by = ?
    WHERE records_id = ?;
  `;

  con.query(query, [leave_type_id, day_type, start_date, end_date, total_days, reasons, leave_status, emp_id, records_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error updating record", success: false });
    }

    if (results.affectedRows > 0) {
      res.status(200).json({ message: "Record updated successfully", success: true });
    } else {
      res.status(404).json({ message: "Record not found or no changes made", success: false });
    }
  });
});

app.post('/remove_records', (req, res) => {
  const { records_id } = req.body;
  const query = "update records  set active=4 where records_id=?";

  con.query(query, [records_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching profile", success: false });
    }
    console.log(results);

    if (results.affectedRows > 0) {
      res.status(200).json({ message: "Successful", success: true });
    } else {
      res.status(200).json({ message: "Invalid Employee", success: false });
    }
  });
});




// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
