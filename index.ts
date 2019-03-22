import express from "express";
import axios from "axios";
import { type } from "os";
import { text } from "body-parser";
const fs = require("fs");

class Api {
  constructor() {
    const app = express();
    app.use(express.json());

    app.use("/files", express.static(__dirname + "/files"));

    app.post("/getSpeech", (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );

      console.log(JSON.stringify(req.body));

      let textChunks: any = this.split(req.body.text);

      let fileName = this.createPlayList(textChunks, () => {
        res.send(
          JSON.stringify({
            url: "http://localhost:8081/" + fileName
          })
        );
      });
    });

    app.listen(8081);
    console.log("speechKit started on port 8081");
  }
  private split(text: string) {
    let words = text.split(" ");

    let index = 0;
    let wordsGrout: string[][] = words.reduce((acum: string[][], word) => {
      if (typeof acum[index] !== "undefined") {
        if (acum[index].length > 15) {
          index++;
        }
      }

      if (typeof acum[index] !== "undefined") {
        acum[index].push(word);
      } else {
        acum[index] = [word];
      }

      return acum;
    }, []);
    return wordsGrout.map(item => {
      return item.join(" ");
    });
  }
  private createPlayList(textChunks: string[], cb: Function) {
    let fileName =
      "playListId" +
      Math.random()
        .toString()
        .substring(2) +
      "time_" +
      +Date.now() +
      ".m3u8";
    let idList: string[] = textChunks.map(() => {
      return (
        "id" +
        Math.random()
          .toString()
          .substring(2) +
        "time_" +
        +Date.now() +
        ".wav"
      );
    });

    let fileContent = `
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-ALLOW-CACHE:YES
#EXT-X-TARGETDURATION:6`;
    idList.forEach(id => {
      fileContent += "\n#EXTINF:-1,chunk" + "\n" + "" + id;
    });
    fileContent += "\n#EXT-X-ENDLIST";
    fs.writeFile("./files/" + fileName, fileContent, "utf8", () => {});

    this.loadChunk(textChunks.shift(), idList.shift(), () => {
      cb();
    });
    this.itararionLoadingChunk(textChunks, idList);

    return fileName;
  }

  private loadChunk(text: string, fileName: string, cb?: Function) {
    axios
      .get(
        "https://tts.voicetech.yandex.net/generate?" +
          "key=22fe10e2-aa2f-4a58-a934-54f2c1c4d908&" +
          "fornat=wav&" +
          "lang=ru-RU&" +
          "emotion=good&" +
          "speaker=alyss&" +
          "robot=1",
        {
          responseType: "arraybuffer",
          params: {
            text: text
          }
        }
      )
      .then((result: any) => {
        fs.writeFile("./files/" + fileName, result.data, () => {
          if (typeof cb !== "undefined") {
            cb(result.data);
          }
        });
      });
  }

  private itararionLoadingChunk(textChunks: string[], idList: string[]) {
    let text = textChunks.shift();
    let id = idList.shift();
    if (typeof text !== "undefined" && typeof id !== "undefined") {
      this.loadChunk(text, id, () => {
        this.itararionLoadingChunk(textChunks, idList);
      });
    }
  }
}

new Api();
