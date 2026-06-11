// 공무원 일정 보고서 자동화 - 일정비서관 로컬 설정 파일
// (HTML 환경에서 안전하게 환경 변수를 관리하기 위한 설정 공간입니다.)

window.CONFIG = {
  // 1. 구글 앱스 스크립트 웹 앱 URL (실시간 구글 스프레드시트 연동용)
  // - 발급받은 Web App URL 주소를 아래 따옴표 안에 붙여넣어 줍니다.
  // - 입력 시 프로그램이 로컬 저장소 대신 실제 구글 스프레드시트 DB와 실시간 통신을 개시합니다.
  // - 비워둘 경우 브라우저 로컬 저장소(LocalStorage) 모드로 안전하게 작동합니다.
  GOOGLE_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbzwExzOQARizRDAM8gbqRRnWstj3b9yiKy2yQ6slXyMDYx3-sHL2nvudEkE7jTqKx0ihQ/exec"
};
