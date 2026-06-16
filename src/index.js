export default {
    async fetch(request, env) {
      return new Response("Hello from Cloudflare Worker!", { status: 200 });
    }
  };
  