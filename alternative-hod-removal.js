// Alternative HOD removal function that reassigns tickets instead of deleting them
// You can replace the current handleRemoveHod function with this if preferred

const handleRemoveHodWithReassignment = async (id) => {
  console.log('Attempting to remove HOD with ID:', id);
  
  if (!id) {
    console.error('No ID provided for deletion');
    toast.error('Invalid HOD ID');
    return;
  }
  
  try {
    // First check if this admin has any tickets assigned
    const { data: tickets, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('admin_id', id);
    
    if (ticketError) {
      console.error('Error checking tickets:', ticketError);
      toast.error('Error checking admin dependencies');
      return;
    }
    
    const hodToDelete = hods.find(h => h.id === id);
    if (!hodToDelete) {
      toast.error('HOD not found');
      return;
    }
    
    if (tickets && tickets.length > 0) {
      // Find another admin in the same branch to reassign tickets to
      const otherAdminsInBranch = hods.filter(h => h.id !== id && h.branch === hodToDelete.branch);
      
      if (otherAdminsInBranch.length === 0) {
        const confirmDelete = window.confirm(
          `This is the only HOD for ${hodToDelete.branch} branch and has ${tickets.length} ticket(s) assigned. ` +
          `Deleting this HOD will also remove all their assigned tickets. ` +
          `Are you sure you want to proceed?`
        );
        
        if (!confirmDelete) return;
        
        // Delete tickets first, then admin
        const { error: deleteTicketsError } = await supabase
          .from('tickets')
          .delete()
          .eq('admin_id', id);
        
        if (deleteTicketsError) {
          console.error('Error deleting tickets:', deleteTicketsError);
          toast.error('Failed to delete associated tickets');
          return;
        }
      } else {
        // Reassign tickets to another admin in the same branch
        const newAdminId = otherAdminsInBranch[0].id;
        const newAdminName = otherAdminsInBranch[0].name;
        
        const confirmReassign = window.confirm(
          `This HOD has ${tickets.length} ticket(s) assigned. ` +
          `These tickets will be reassigned to ${newAdminName} (${hodToDelete.branch} HOD). ` +
          `Are you sure you want to proceed?`
        );
        
        if (!confirmReassign) return;
        
        // Reassign tickets to another admin
        const { error: reassignError } = await supabase
          .from('tickets')
          .update({ admin_id: newAdminId })
          .eq('admin_id', id);
        
        if (reassignError) {
          console.error('Error reassigning tickets:', reassignError);
          toast.error('Failed to reassign tickets');
          return;
        }
        
        console.log(`Tickets reassigned to ${newAdminName}`);
      }
    } else {
      // No tickets, just confirm admin deletion
      if (!window.confirm('Are you sure you want to remove this HOD? This will permanently delete their admin access.')) {
        return;
      }
    }
    
    // Now delete the admin
    const { data, error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error removing HOD:', error);
      setError(`Failed to remove HOD: ${error.message}`);
      toast.error(`Failed to remove HOD: ${error.message}`);
    } else if (data && data.length > 0) {
      const ticketCount = tickets ? tickets.length : 0;
      const message = ticketCount > 0 
        ? `HOD ${data[0].name} removed and ${ticketCount} tickets reassigned successfully`
        : `HOD ${data[0].name} removed successfully`;
      toast.success(message);
      fetchHods();
      setError('');
    }
  } catch (err) {
    console.error('Unexpected error removing HOD:', err);
    setError('Failed to remove HOD');
    toast.error('Failed to remove HOD');
  }
};
