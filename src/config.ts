const password: string = encodeURIComponent('Cr7KM7Ym4esNxQzM');

const config = {
    connectionString: `mongodb+srv://danield:${password}@danield.8r0msyf.mongodb.net/?retryWrites=true&w=majority`,
    db: 'danielsconnect4',
    collection: 'game',
};

export default config;