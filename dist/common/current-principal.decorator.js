"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentPrincipal = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentPrincipal = (0, common_1.createParamDecorator)((_data, context) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const id = user?.id ?? user?.sub;
    if (!id) {
        throw new common_1.UnauthorizedException('Se requiere autenticación');
    }
    return {
        id,
        roles: user?.roles ?? (user?.role ? [user.role] : []),
    };
});
//# sourceMappingURL=current-principal.decorator.js.map