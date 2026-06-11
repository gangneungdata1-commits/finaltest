# 일정비서관 - 공무원 일정 보고서 자동화 (Standalone)

## 설치 방법

1. 이 저장소를 클론하거나 다운로드합니다.
2. `config.example.js` 파일을 복사하여 같은 폴더에 `config.js` 라는 이름으로 저장합니다.
3. `config.js` 안의 `GOOGLE_WEB_APP_URL` 값에 본인의 구글 앱스 스크립트 웹 앱 URL을 입력합니다. (선택 사항)

## 실행 방법

별도의 빌드/서버 설치 없이 정적 HTML로 동작합니다.

- `index.html` 파일을 더블클릭하여 브라우저에서 바로 엽니다.
- 또는 정적 서버로 실행:
  ```
  npx serve .
  ```

## 필요한 환경설정 (config.js)

| 변수명 | 설명 | 필수 여부 |
| --- | --- | --- |
| `GOOGLE_WEB_APP_URL` | 구글 스프레드시트 연동용 Apps Script 웹 앱 URL | 선택 (비워두면 브라우저 로컬 저장소 모드로 동작) |

> `config.js`는 `.gitignore`에 등록되어 있어 GitHub에 올라가지 않습니다. 예시 파일은 `config.example.js`를 참고하세요.

기타 API 키(예: Gemini API Key)는 코드에 저장하지 않고, 앱 화면 내 설정 패널에서 직접 입력하면 브라우저 로컬 저장소에 저장됩니다.

## 구글 스프레드시트 연동

상위 폴더의 `구글시트설정.md` 문서를 참고하여 구글 앱스 스크립트를 배포하고 발급받은 URL을 `config.js`에 입력하세요.
