const fs = require("fs");

function saveToArchive(data) {
  let oldData = [];
  try {
    const oldFile = fs.readFileSync("./public/analysis.json", "utf-8");

    if (oldFile) {
      oldData = JSON.parse(oldFile);
    }
  } catch (err) {}
  fs.writeFileSync(
    "./public/analysis.json",
    JSON.stringify([...data.Blocks, ...oldData], null, 2)
  );

  console.log("Arquivo salvo com sucesso!");
}

module.exports = {
  saveToArchive,
};
