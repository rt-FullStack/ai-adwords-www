const styles = {
  color: {
    dark: {
      backgroundColor: "#F5A623",
      border: "4px solid #F5A623",
      borderRadius: "1.5rem",
      fontWeight: "550",
    },
    light: {
      backgroundColor: "transparent",
      border: "4px solid #F5A623",
      borderRadius: "1.5rem",
      fontWeight: "550",
    },
    blue: {
      backgroundColor: "transparent",
      color: "#37C1FE",
    },
  },
  size: {
    small: {
      fontSize: "0.875rem",
      padding: "0.25rem 0.75rem",
    },
    medium: {
      fontSize: "1rem",
      padding: "0.25rem 1.25rem",
    },
    large: {
      fontSize: "1.25rem",
      padding: "0.5rem 1.5rem",
    }
  },
  hover: {
    dark: {
      backgroundColor: "rgba(245, 166, 35, 0.5)",
      borderColor: "rgba(245, 165, 35, 0)",
    },
    light: {
      backgroundColor: "rgba(245, 166, 35, 0.5)",
      borderColor: "rgba(245, 166, 35, 0.5)",
      color: "#242234",
    },
  },
};

export default function Button({ title, color, size, onClick, style: customStyle }) {
  const baseStyle = {
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    cursor: "pointer",
    transition: "all 0.3s ease",
    ...styles.color[color],
    ...styles.size[size],
    ...customStyle, // Add custom styles
  };

  const handleMouseEnter = (e) => {
    Object.assign(e.target.style, styles.hover[color]);
  };

  const handleMouseLeave = (e) => {
    Object.assign(e.target.style, styles.color[color]);
  };

  return (
    <button
      onClick={onClick}
      style={baseStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      {title}
    </button>
  );
}