/**
 * HTTP 상태 코드 상수
 * 라우터·미들웨어에서 상태 코드 리터럴 대신 의미 있는 이름으로 참조합니다. (이 샘플에서 실제 사용하는 코드만 정의)
 */
module.exports = Object.freeze({
    OK: 200,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
});
