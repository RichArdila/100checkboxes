const socket = io({
  auth: {
    serverOffset: 0,
  },
});

const checkboxesContainer = document.getElementById("checkboxes");

// Create 100 checkboxes
for (let i = 0; i < 100; i++) {
  const checkboxContainer = document.createElement("div");
  checkboxContainer.classList.add("checkbox-container");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = `checkbox-${i}`;
  checkbox.dataset.index = i;
  checkboxContainer.appendChild(checkbox);
  checkboxesContainer.appendChild(checkboxContainer);
}

// Listen for checkbox changes
checkboxesContainer.addEventListener("change", (event) => {
  if (event.target.type === "checkbox") {
    const index = event.target.dataset.index;
    const checked = event.target.checked;
    socket.emit("checkboxChange", { index, checked });
  }
});

// Update checkboxes based on server data
socket.on("updateCheckboxes", (index, checked, id) => {
  document.getElementById(`checkbox-${index}`).checked = checked;
});

// Listen for checkbox updates from server
socket.on("checkboxChange", ({ index, checked }) => {
  document.getElementById(`checkbox-${index}`).checked = checked;
});
