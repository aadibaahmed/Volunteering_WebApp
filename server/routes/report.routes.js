import express from "express";
import PDFDocument from "pdfkit";
import { query } from "../database.js";
import { requireAuth } from "../middleware/auth.js";
import { Parser } from "json2csv";

const router = express.Router();

//volunteer report
router.get("/volunteers", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "superuser") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { from, to, all, format = "pdf" } = req.query;
    console.log("Generating volunteer report:", format, all ? "All data" : `${from} to ${to}`);

    let sql = `
      SELECT  
        uc.user_id,
        uc.email,
        CONCAT_WS(' ', up.first_name, up.last_name) AS name,
        e.name AS event_name,
        TO_CHAR(vh.participation_date, 'YYYY-MM-DD') AS participation_date,
        vh.hours_served
      FROM volunteer_history vh
      JOIN events e ON vh.event_id = e.event_id
      JOIN user_credentials uc ON vh.user_id = uc.user_id
      LEFT JOIN user_profile up ON uc.user_id = up.user_id
    `;

    const values = [];
    if (!all) {
      sql += ` WHERE vh.participation_date BETWEEN $1 AND $2`;
      values.push(from, to);
    }

    sql += ` ORDER BY name ASC`;

    const { rows } = await query(sql, values);

    if (format === "csv") {
      try {
        const parser = new Parser();
        const csv = parser.parse(rows);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=volunteer_report.csv");
        return res.status(200).send(csv);
      } catch (csvError) {
        console.error("CSV generation error:", csvError);
        return res.status(500).json({ error: "Failed to generate CSV" });
      }
    }


    const doc = new PDFDocument({ margin: 30, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=volunteer_report.pdf");
    doc.pipe(res);

    doc.fontSize(20).text("Volunteer Activity Report", { align: "center" });
    doc.moveDown(2);

    rows.forEach(row => {
      doc.fontSize(12).text(`Volunteer: ${row.name || "Unknown"}`);
      doc.text(`Email: ${row.email}`);
      doc.text(`Event: ${row.event_name}`);
      doc.text(`Date: ${row.participation_date}`);
      doc.text(`Hours: ${row.hours_served}`);
      doc.moveDown(1);
      doc.moveTo(30, doc.y).lineTo(580, doc.y).stroke();
      doc.moveDown(1);
    });

    doc.end();
  } catch (error) {
    console.error("Volunteer report error:", error);
    res.status(500).json({ error: "Failed to generate volunteer report" });
  }
});


//event
router.get("/events", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "superuser") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { from, to, all, format = "pdf" } = req.query;
    console.log("Generating event report:", format, all ? "All data" : `${from} to ${to}`);

    let sql = `
      SELECT 
        e.event_id,
        e.name AS event_name,
        TO_CHAR(e.event_date, 'YYYY-MM-DD') AS event_date,
        TO_CHAR(e.time_start, 'HH24:MI') AS time_start,
        TO_CHAR(e.time_end, 'HH24:MI') AS time_end,
        e.location,
        e.manager_email,
        STRING_AGG(DISTINCT uc.email, ', ') AS volunteer_emails
      FROM events e
      LEFT JOIN volunteer_history vh ON vh.event_id = e.event_id
      LEFT JOIN user_credentials uc ON vh.user_id = uc.user_id
      WHERE e.manager_email IS NOT NULL
    `;

    const values = [];
    if (!all) {
      sql += ` AND e.event_date BETWEEN $1 AND $2`;
      values.push(from, to);
    }

    sql += `
      GROUP BY e.event_id, e.name, e.event_date, e.location, e.manager_email, e.time_start, e.time_end
      ORDER BY e.event_date DESC
    `;

    const { rows } = await query(sql, values);

    if (format === "csv") {
      try {
        const parser = new Parser();
        const csv = parser.parse(rows);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=event_report.csv");
        return res.status(200).send(csv);
      } catch (csvError) {
        console.error("CSV generation error:", csvError);
        return res.status(500).json({ error: "Failed to generate CSV" });
      }
    }

    // PDF fallback
    const doc = new PDFDocument({ margin: 30, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=event_report.pdf");
    doc.pipe(res);

    doc.fontSize(20).text("Event Management Report", { align: "center" });
    doc.moveDown(2);

    rows.forEach(event => {
      doc.fontSize(12).text(`Event: ${event.event_name}`);
      doc.text(`Date: ${event.event_date}`);
      doc.text(`Location: ${event.location}`);
      doc.text(`Volunteers: ${event.volunteer_emails || "None assigned"}`);
      doc.text(`Manager: ${event.manager_email || "Unknown"}`);
      doc.text(`Time Start: ${event.time_start || "N/A"}`);
      doc.text(`Time End: ${event.time_end || "N/A"}`);
      doc.moveDown(1);
      doc.moveTo(30, doc.y).lineTo(580, doc.y).stroke();
      doc.moveDown(1);
    });

    doc.end();
  } catch (error) {
    console.error("Event report error:", error);
    res.status(500).json({ error: "Failed to generate event report" });
  }
});

export default router;