const content = `texto antes
[G1](https://news.google.com/rss/articles/CBMiswFBVV95cUxPcC1POGVHVGJua19KMmlLTTRQOGEtbTBBOWhYVUJyNzdWUElKNTZFNXFsaHlFVUNIYkdjbVJFRDJCcWNEakZjdkNTUjhtVzZNb3ZWbXJsbVp5SDZOa0FPRVRPTy1mZFFEVmhDRFdjeklhcmpwOGZkM2tTa0NydGtRWDNsY3R5YmJFVzVPTEhlTDY3QW9TUlJxN3N5T0lWV0lpcEtGOHNTT0RjSHZodEVRdW5Bd9IBwgFBVV95cUxOUFlSdmpwWldQMHprdGYwaHh2MHZxRENITXV4Mmp2UEg2dnhqeGlKekFtVXNZSU1zaFp4Yk5XNi1lU1FHcHJoMEp2WFdrQ29lY0hhVWV2NVpELVFPcXZXZUFNLVI4b0g2Q0V1eHJELW9iMmR3Y1Y1SlVDcVFkQnMxTGdILXF3QWVNX01aYzA0WWc5OUkyWXRGYi1faUljcEduSTZyaUQwVUR4b0JOUVpGTHRwclZwaElzUkNhNTJRUVVVZw?oc=5], texto depois`;

let replaced = content.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+?)\][\,\.]?/g, '[$1]($2)');
console.log(replaced);

let streaming = `pesquisa na fonte [G1](https://news.google.com`;
replaced = streaming.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]*)$/, '[$1]($2)');
console.log(replaced);

let hr = `text before
---
text after`;
replaced = hr.replace(/\n\s*---\s*\n/g, '\n\n').replace(/^\s*---\s*\n/g, '');
console.log(replaced);

