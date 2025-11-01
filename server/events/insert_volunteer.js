import { pool } from "../database.js";

export async function insert_volunteer(req,res) {
    console.log("insert volunteer called");
    const event_id = Number(req.body.event_id || req.body.id || req.params.id);    const user_id = Number(req.body.user_id?.id || req.body.user_id);
    console.log("Event ID:", event_id, "User ID:", user_id);


     try {
    const result = await pool.query(
     `
      UPDATE events
      SET volunteer_ids = ARRAY(
        SELECT DISTINCT unnest(volunteer_ids || ARRAY[$1]::int[])
      )
      WHERE event_id = $2
      RETURNING *;
      `,
      [user_id, event_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({
      message: "Volunteer successfully added to event",
      event: result.rows[0],
    });
  } catch (error) {
    console.error("Error inserting volunteer:", error);
    res.status(500).json({ message: "Error inserting volunteer" });
  }
}