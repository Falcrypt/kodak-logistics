function locationDetails(room, floor) {
    const values = [room, floor].map(value => {
        if (value === undefined || value === null) return '';
        if (typeof value !== 'string' || value.trim().length > 50) {
            const error = new Error('Room number and floor must be text of at most 50 characters');
            error.status = 400;
            throw error;
        }
        return value.trim();
    });
    return { room_number: values[0], floor: values[1] };
}
function formatLocation(address, room, floor) {
    return [address, room ? `Room ${room}` : '', floor].filter(Boolean).join(', ');
}
module.exports = { locationDetails, formatLocation };
