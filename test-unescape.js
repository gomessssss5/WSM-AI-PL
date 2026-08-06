const content = "<!DOCTYPE html>\\n<html>\\n<head>\\n<title>test</title>\\n</head>\\n</html>";
console.log(content.replace(/\\n/g, '\n').replace(/\\"/g, '"'));
