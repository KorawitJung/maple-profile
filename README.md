# Maple Profile

An animated pixel-art maple tree for your GitHub profile README. The tree stands by a stream in an autumn forest, with a park bench underneath. Yellow leaves fall five at a time. Each red flower on the tree is one contribution you made today, so by the end of the day you can count your effort.

<p align="center">
  <img src="docs/preview.svg" width="100%" alt="A yellow maple tree by a blue stream with 12 red flowers and a green park bench" />
</p>

## How it works

A scheduled workflow in your profile repository runs this action. The action does three things:

1. It reads today's contribution count from the GitHub GraphQL API, using the workflow's own token.
2. It draws a self-contained SVG. The scene is the same every time. Only the number of flowers changes.
3. It force-pushes the SVG as the only file on a separate branch, `output` by default. Your `main` branch is never touched, and the push happens only when the image changed.

The image animates with CSS and SMIL only, so it plays inside a README image. Flowers bloom one by one when someone opens your profile.

## Set it up

You need a profile repository, which is a public repository named exactly like your username.

1. Copy [`examples/maple.yml`](examples/maple.yml) to `.github/workflows/maple.yml` in your profile repository.
2. Set `timezone` to your IANA time zone, such as `Asia/Bangkok` or `Europe/Berlin`. Your day, and the flower count, resets at midnight in this zone.
3. Add this to your profile `README.md`, with your username in both places:

	```html
	<img src="https://raw.githubusercontent.com/YOUR-USERNAME/YOUR-USERNAME/output/maple.svg" width="100%" alt="My maple tree. Each red flower is one contribution today." />
	```

4. Open the **Actions** tab, pick **Maple**, and click **Run workflow** once. After that, the tree updates every hour.

The README shows a broken image until the first run finishes.

### Catch the end of your day

An hourly run can miss work you do in the last hour of the day. To catch it, add runs shortly before your local midnight. Cron times are in UTC. For `Asia/Bangkok` (UTC+7), 23:30 and 23:50 local time are:

```yaml
on:
  schedule:
    - cron: "17 * * * *"
    - cron: "30 16 * * *"
    - cron: "50 16 * * *"
```

GitHub often starts scheduled runs 10 to 60 minutes late, so a run can still land after midnight and show the new day.

## Inputs

| Input | Default | What it does |
| --- | --- | --- |
| `login` | the repository owner | The account whose contributions are counted. |
| `timezone` | `UTC` | The IANA time zone that decides when your day starts. |
| `token` | `${{ github.token }}` | Reads the contribution calendar and pushes the image. Keep the default. |
| `branch` | `output` | The branch that receives the image. The action refuses `main`, `master`, and your default branch. |
| `file` | `maple.svg` | The file name of the image on that branch. |
| `publish` | `"true"` | Set to `"false"` to draw the image without pushing it. |

The action also sets the output `svg-path`, the path of the drawn SVG on the runner.

## Limits

- The tree holds 57 flowers. On days with more contributions, the tree is in full bloom and stops adding flowers.
- The count is the number in today's square of your contribution graph. GitHub decides what counts. By default only public activity counts, unless you turn on private contributions in your profile settings.
- New flowers appear up to about an hour after you work, plus up to 5 minutes of image caching by GitHub.
- The action runs on GitHub-hosted runners, which already have Node. It has no dependencies.

## Run it locally

```sh
node --test src/*.test.mjs
node src/render.mjs --count 17 --out preview.local.svg
GITHUB_TOKEN=$(gh auth token) node src/render.mjs --login YOUR-USERNAME --timezone Asia/Bangkok --out today.local.svg
```

## Disclaimer

- This project is not affiliated with, sponsored by, or endorsed by GitHub, Inc. "GitHub" is a trademark of GitHub, Inc.
- The software is provided "as is", without warranty of any kind. See [LICENSE](LICENSE). You use it at your own risk.
- The action reads only the contribution calendar of the account you name, through the GitHub API, with the token you give it. It sends no data anywhere else.
- The action force-pushes to the branch named in `branch`. Anything else on that branch is replaced. Never point it at a branch whose history you want to keep.
- Scheduled workflows use GitHub Actions minutes. They are free for public repositories, but your plan's limits apply. GitHub may delay scheduled runs, and it disables them after 60 days without repository activity.
- The flower count comes from GitHub's data and can lag or differ from what you expect. Do not use it as a record of work.
- The idea of a profile picture that grows from your GitHub activity was inspired by [git-koi](https://github.com/yalongwastaken/git-koi) by yalongwastaken. This project shares no code with it. The pixel-art scene is original.

## ภาษาไทย

Action นี้วาดต้นเมเปิล pixel art ที่ขยับได้สำหรับหน้า README ของโปรไฟล์ GitHub ดอกสีแดงแต่ละดอกคือหนึ่ง contribution ที่คุณทำในวันนี้ วิธีติดตั้งคือคัดลอก [`examples/maple.yml`](examples/maple.yml) ไปไว้ที่ `.github/workflows/maple.yml` ใน repo โปรไฟล์ของคุณ ตั้ง `timezone: Asia/Bangkok` แล้วเพิ่มแท็ก `<img>` ตามหัวข้อ "Set it up" ลงใน README

ข้อจำกัดความรับผิดชอบ: โปรเจกต์นี้ไม่มีส่วนเกี่ยวข้องกับ GitHub, Inc. ซอฟต์แวร์ให้ใช้ตามสภาพ ไม่มีการรับประกันใดๆ ตามเงื่อนไขของ MIT License และ Action จะ force-push ไปที่ branch ที่ตั้งไว้ใน `branch` ห้ามตั้งเป็น branch ที่มีประวัติที่ต้องการเก็บไว้

## License
The code is released under the [MIT](LICENSE) License. The license covers this project's code only. News headlines, summaries and images remain the property of their publishers.

