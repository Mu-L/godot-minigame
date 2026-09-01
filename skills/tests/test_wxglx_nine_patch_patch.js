const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(process.argv[2] || ".");
const canvasPath = path.join(root, "servers/rendering/renderer_canvas_cull.cpp");
const headerPath = path.join(root, "platform/web/godot_js.h");
const displayPath = path.join(root, "platform/web/js/libs/library_godot_display.js");

const canvas = fs.readFileSync(canvasPath, "utf8");
const header = fs.readFileSync(headerPath, "utf8");
const display = fs.readFileSync(displayPath, "utf8");

assert.ok(
	canvas.includes("#ifdef WECHAT_GLX_EXPERIMENTAL"),
	"nine-patch expansion must remain compile-time scoped to GLX-capable builds"
);
assert.ok(
	canvas.includes("bool _is_wx_glx_runtime_enabled()"),
	"nine-patch expansion must query the pinned runtime mode"
);
assert.ok(
	canvas.includes("godot_js_display_is_wx_glx_enabled() == 1"),
	"runtime mode query must use the display bridge"
);
assert.ok(
	canvas.includes("MAX_NINE_PATCH_TILES_PER_AXIS = 64"),
	"tile expansion must remain bounded"
);

const functionStart = canvas.indexOf("void RendererCanvasCull::canvas_item_add_nine_patch");
const runtimeGate = canvas.indexOf("if (_is_wx_glx_runtime_enabled())", functionStart);
const rectExpansion = canvas.indexOf("canvas_item_add_texture_rect_region", runtimeGate);
const originalFallback = canvas.indexOf("Item::CommandNinePatch *style", functionStart);

assert.ok(functionStart >= 0, "canvas_item_add_nine_patch must exist");
assert.ok(runtimeGate > functionStart, "nine-patch expansion must be runtime-gated");
assert.ok(rectExpansion > runtimeGate, "WXGLX path must emit regular texture rectangles");
assert.ok(
	originalFallback > rectExpansion,
	"standard WebGL and invalid inputs must retain Godot's original nine-patch command"
);

assert.ok(
	header.includes("extern int godot_js_display_is_wx_glx_enabled();"),
	"Godot JS header must declare the runtime-mode bridge"
);
assert.ok(
	display.includes("godot_js_display_is_wx_glx_enabled__proxy: 'sync'"),
	"display library must expose a synchronous runtime-mode bridge"
);
assert.ok(
	display.includes("root.__godotMinigameWXGLXEnabled === true ? 1 : 0"),
	"display bridge must read the loader's pinned WXGLX mode"
);

console.log("WXGLX nine-patch patch tests passed");
