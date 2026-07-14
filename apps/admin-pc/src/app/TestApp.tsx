import { useState } from "react";

export default function TestApp() {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ 
      width: "100vw", 
      height: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "#0d1629",
      color: "#ffffff",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "48px", marginBottom: "20px" }}>蜂乐玛系统测试</h1>
        <p style={{ fontSize: "24px", color: "#94a3b8", marginBottom: "40px" }}>
          系统正在运行
        </p>
        <button
          onClick={() => setCount(count + 1)}
          style={{
            padding: "12px 32px",
            fontSize: "18px",
            background: "linear-gradient(135deg, #4361ee, #7c3aed)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          点击测试: {count}
        </button>
      </div>
    </div>
  );
}
