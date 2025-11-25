import React, { useState } from 'react'
import Header from '../../assets/header_after/header_after.jsx'

export default function Reports() {
  const [activeReport, setActiveReport] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [allData, setAllData] = useState(false);
  const [fileFormat, setFileFormat] = useState("pdf"); //pdf or csv

  const handleGenerate = () => {
    if (!activeReport) return alert("Please select a report type");

    let type = activeReport === "Volunteer" ? "volunteers" : "events";

    let url = `http://localhost:3000/api/reports/${type}`;

    if (allData) {
      url += `?all=true&format=${fileFormat}`;
    } else {
      if (!fromDate || !toDate) {
        return alert("Please select both dates or check 'All data'");
      }
      url += `?from=${fromDate}&to=${toDate}&format=${fileFormat}`;
    }

    const token = localStorage.getItem('token');

    fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.blob();
      })
      .then(blob => {
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = `${type}_report.${fileFormat}`;
        link.click();
      })
      .catch(err => {
        console.error("Fetch error:", err);
        alert("Error generating report");
      });
  };

  return (
    <div>
      <Header />

      <div style={{ marginTop: "100px", padding: "30px" }}>
        <h1>Reports</h1>
        <p>Choose the type of report you want to generate</p>

        <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
          <button onClick={() => setActiveReport("Volunteer")}>
            Volunteer Report
          </button>
          <button onClick={() => setActiveReport("Event")}>
            Event Report
          </button>
        </div>

        {activeReport && (
          <div style={{
            marginTop: "40px",
            padding: "20px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            maxWidth: "500px"
          }}>
            <h2>{activeReport} Report</h2>

            <div style={{ marginBottom: "15px" }}>
              <label>From date:</label><br />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={allData}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>To date:</label><br />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                disabled={allData}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label>
                <input
                  type="checkbox"
                  checked={allData}
                  onChange={() => setAllData(!allData)}
                />
                {' '}All data
              </label>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label><b>Format:</b></label><br />
              <label>
                <input
                  type="radio"
                  value="pdf"
                  checked={fileFormat === "pdf"}
                  onChange={() => setFileFormat("pdf")}
                />
                PDF
              </label>{' '}
              <label>
                <input
                  type="radio"
                  value="csv"
                  checked={fileFormat === "csv"}
                  onChange={() => setFileFormat("csv")}
                />
                CSV
              </label>
            </div>

            <button
              onClick={handleGenerate}
              style={{
                padding: "10px 20px",
                backgroundColor: "#3f72af",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Generate Report
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
